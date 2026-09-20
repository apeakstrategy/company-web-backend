const prisma = require("../config/prisma");
const mail = require("./newsletter-mail.service");
const { unsubscribeToken } = require("./newsletter.service");

let timer;
let busy = false;

async function finishCampaign(campaignId, db = prisma) {
  const outstanding = await db.newsletterDelivery.count({
    where: { campaignId, status: { in: ["PENDING", "SENDING"] } },
  });
  if (!outstanding) {
    await db.newsletterCampaign.updateMany({
      where: { id: campaignId, status: { in: ["QUEUED", "SENDING"] } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

exports.processOne = async (db = prisma) => {
  const next = await db.newsletterDelivery.findFirst({
    where: { status: "PENDING" }, orderBy: { id: "asc" }, select: { id: true },
  });
  if (!next) {
    const campaigns = await db.newsletterCampaign.findMany({
      where: { status: { in: ["QUEUED", "SENDING"] } }, select: { id: true }, take: 20,
    });
    for (const campaign of campaigns) await finishCampaign(campaign.id, db);
    return false;
  }
  const claimed = await db.newsletterDelivery.updateMany({
    where: { id: next.id, status: "PENDING" },
    data: { status: "SENDING", claimedAt: new Date() },
  });
  if (!claimed.count) return true;
  const delivery = await db.newsletterDelivery.findUnique({
    where: { id: next.id }, include: { campaign: true, subscriber: true },
  });
  await db.newsletterCampaign.updateMany({
    where: { id: delivery.campaignId, status: "QUEUED" }, data: { status: "SENDING" },
  });
  if (!delivery.subscriber || delivery.subscriber.status !== "ACTIVE" ||
      delivery.subscriber.email !== delivery.email) {
    await db.newsletterDelivery.update({
      where: { id: delivery.id }, data: { status: "SKIPPED", error: "Subscriber no longer active" },
    });
  } else {
    try {
      const result = await mail.sendCampaign(
        delivery.email, delivery.campaign.subject, delivery.campaign.body,
        unsubscribeToken(delivery.subscriber),
      );
      await db.newsletterDelivery.update({
        where: { id: delivery.id },
        data: { status: "SENT", sentAt: new Date(), providerMessageId: result.messageId?.slice(0, 255) || null },
      });
    } catch (error) {
      console.error("Newsletter delivery failed", { deliveryId: delivery.id, error: error.message });
      await db.newsletterDelivery.update({
        where: { id: delivery.id }, data: { status: "FAILED", error: String(error.message || error).slice(0, 1000) },
      });
    }
  }
  await finishCampaign(delivery.campaignId, db);
  return true;
};

exports.start = async () => {
  if (timer) return;
  // A send interrupted by a process crash has an unknown outcome. Mark it failed
  // instead of retrying automatically and risking a duplicate promotional email.
  await prisma.newsletterDelivery.updateMany({
    where: { status: "SENDING", claimedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
    data: { status: "FAILED", error: "Delivery interrupted; outcome unknown" },
  });
  timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try { await exports.processOne(); }
    catch (error) { console.error("Newsletter worker error", error); }
    finally { busy = false; }
  }, 2000);
  timer.unref();
};

exports.stop = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
