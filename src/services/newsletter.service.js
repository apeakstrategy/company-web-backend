const crypto = require("node:crypto");
const prisma = require("../config/prisma");
const mail = require("./newsletter-mail.service");
const AppError = require("../utils/AppError");

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("hex");
const genericSignup = { message: "Check your inbox for a confirmation link. If you are already subscribed, you are all set." };

function unsubscribeToken(subscriber) {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new AppError(503, "Newsletter links are not configured");
  const digest = crypto.createHmac("sha256", secret).update(`${subscriber.id}:${subscriber.email}`).digest("hex");
  return `${subscriber.id}.${digest}`;
}

async function sendConfirmation(subscriber, token, db = prisma) {
  try { await mail.sendConfirmation(subscriber.email, token); }
  catch (error) {
    console.error("Newsletter confirmation email failed", { subscriberId: subscriber.id, error: error.message });
    throw new AppError(503, "We could not send the confirmation email. Please try again later.");
  }
  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { confirmationSentAt: new Date() },
  });
}

async function createPending(email, consentSource, db = prisma) {
  mail.assertConfigured();
  const token = newToken();
  const now = new Date();
  const subscriber = await db.newsletterSubscriber.create({
    data: {
      email,
      status: "PENDING",
      consentSource,
      consentAt: consentSource === "footer" ? now : null,
      confirmationTokenHash: tokenHash(token),
      confirmationExpiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    },
  });
  await sendConfirmation(subscriber, token, db);
  return subscriber;
}

exports.publicSubscribe = async ({ email, website }, db = prisma) => {
  if (website) return genericSignup;
  mail.assertConfigured();
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === "ACTIVE") return genericSignup;
  if (existing?.status === "PENDING" && existing.confirmationSentAt &&
      Date.now() - new Date(existing.confirmationSentAt).getTime() < 5 * 60 * 1000) return genericSignup;
  if (!existing) {
    try { await createPending(email, "footer", db); }
    catch (error) { if (error.code !== "P2002") throw error; }
  } else {
    const token = newToken();
    const now = new Date();
    const subscriber = await db.newsletterSubscriber.update({
      where: { id: existing.id },
      data: {
        status: "PENDING", consentSource: "footer", consentAt: now,
        confirmedAt: null, unsubscribedAt: null,
        confirmationTokenHash: tokenHash(token),
        confirmationExpiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        confirmationSentAt: null,
      },
    });
    await sendConfirmation(subscriber, token, db);
  }
  return genericSignup;
};

exports.confirm = async (token, db = prisma) => {
  const subscriber = await db.newsletterSubscriber.findUnique({ where: { confirmationTokenHash: tokenHash(token) } });
  if (!subscriber || subscriber.status !== "PENDING" || !subscriber.confirmationExpiresAt ||
      subscriber.confirmationExpiresAt < new Date()) {
    throw new AppError(400, "This confirmation link is invalid or has expired");
  }
  const updated = await db.newsletterSubscriber.updateMany({
    where: { id: subscriber.id, status: "PENDING", confirmationTokenHash: tokenHash(token) },
    data: {
      status: "ACTIVE", confirmedAt: new Date(), unsubscribedAt: null,
      confirmationTokenHash: null, confirmationExpiresAt: null,
    },
  });
  if (!updated.count) throw new AppError(400, "This confirmation link has already been used");
  return { message: "Your subscription is confirmed." };
};

exports.unsubscribe = async (token, db = prisma) => {
  const [idText, digest] = token.split(".");
  const subscriber = await db.newsletterSubscriber.findUnique({ where: { id: Number(idText) } });
  if (!subscriber || !digest) throw new AppError(400, "Invalid unsubscribe link");
  const expected = unsubscribeToken(subscriber).split(".")[1];
  if (!crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"))) {
    throw new AppError(400, "Invalid unsubscribe link");
  }
  if (subscriber.status !== "UNSUBSCRIBED") {
    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "UNSUBSCRIBED", unsubscribedAt: new Date(),
        confirmationTokenHash: null, confirmationExpiresAt: null,
      },
    });
  }
  return { message: "You have been unsubscribed." };
};

exports.listSubscribers = async ({ page, limit, search, status }, db = prisma) => {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { email: { contains: search } } : {}),
  };
  const [totalItems, data] = await db.$transaction([
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, status: true, consentSource: true,
        consentAt: true, confirmedAt: true, unsubscribedAt: true,
        createdAt: true, updatedAt: true,
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { data, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

exports.getSubscriber = async (id, db = prisma) => {
  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, consentSource: true, consentAt: true, confirmedAt: true, unsubscribedAt: true, createdAt: true, updatedAt: true },
  });
  if (!subscriber) throw new AppError(404, "Subscriber not found");
  return subscriber;
};

exports.createSubscriber = async (email, db = prisma) => {
  if (await db.newsletterSubscriber.findUnique({ where: { email } })) throw new AppError(409, "This email is already on the list");
  const subscriber = await createPending(email, "admin_invite", db);
  return exports.getSubscriber(subscriber.id, db);
};

exports.resendConfirmation = async (id, db = prisma) => {
  const existing = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Subscriber not found");
  if (existing.status !== "PENDING") throw new AppError(409, "Only pending subscribers need confirmation");
  if (existing.confirmationSentAt && Date.now() - new Date(existing.confirmationSentAt).getTime() < 5 * 60 * 1000) {
    throw new AppError(429, "Wait five minutes before sending another invitation");
  }
  mail.assertConfigured();
  const token = newToken();
  const updated = await db.newsletterSubscriber.update({
    where: { id },
    data: {
      confirmationTokenHash: tokenHash(token),
      confirmationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      confirmationSentAt: null,
    },
  });
  await sendConfirmation(updated, token, db);
  return exports.getSubscriber(id, db);
};

exports.updateSubscriber = async (id, input, db = prisma) => {
  const existing = await exports.getSubscriber(id, db);
  if (input.email && input.email !== existing.email) {
    mail.assertConfigured();
    const token = newToken();
    const now = new Date();
    const updated = await db.newsletterSubscriber.update({
      where: { id },
      data: {
        email: input.email, status: "PENDING", consentSource: "admin_invite",
        consentAt: null, confirmedAt: null, unsubscribedAt: null,
        confirmationTokenHash: tokenHash(token),
        confirmationExpiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        confirmationSentAt: null,
      },
    });
    await sendConfirmation(updated, token, db);
  } else if (input.status === "UNSUBSCRIBED") {
    await db.newsletterSubscriber.update({
      where: { id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date(), confirmationTokenHash: null, confirmationExpiresAt: null },
    });
  }
  return exports.getSubscriber(id, db);
};

exports.deleteSubscriber = async (id, db = prisma) => {
  await exports.getSubscriber(id, db);
  await db.$transaction(async (tx) => {
    await tx.newsletterDelivery.updateMany({
      where: { subscriberId: id },
      data: { subscriberId: null, email: `deleted-${id}@example.invalid` },
    });
    await tx.newsletterSubscriber.delete({ where: { id } });
  });
};

exports.listCampaigns = async ({ page, limit }, db = prisma) => {
  const [totalItems, data] = await db.$transaction([
    db.newsletterCampaign.count(),
    db.newsletterCampaign.findMany({
      skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
      include: { _count: { select: { deliveries: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { data, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

exports.getCampaign = async (id, db = prisma) => {
  const campaign = await db.newsletterCampaign.findUnique({
    where: { id },
    include: { _count: { select: { deliveries: true } } },
  });
  if (!campaign) throw new AppError(404, "Campaign not found");
  const counts = await db.newsletterDelivery.groupBy({
    by: ["status"], where: { campaignId: id }, _count: { _all: true },
  });
  return { ...campaign, deliveryCounts: Object.fromEntries(counts.map((item) => [item.status, item._count._all])) };
};

exports.listDeliveries = async (id, { page, limit, status }, db = prisma) => {
  await exports.getCampaign(id, db);
  const where = { campaignId: id, ...(status ? { status } : {}) };
  const [totalItems, data] = await db.$transaction([
    db.newsletterDelivery.count({ where }),
    db.newsletterDelivery.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { id: "asc" },
      select: { id: true, email: true, status: true, error: true, sentAt: true, createdAt: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { data, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

exports.createCampaign = (input, db = prisma) => db.newsletterCampaign.create({ data: input });

exports.updateCampaign = async (id, input, db = prisma) => {
  const updated = await db.newsletterCampaign.updateMany({ where: { id, status: "DRAFT" }, data: input });
  if (!updated.count) {
    await exports.getCampaign(id, db);
    throw new AppError(409, "Only draft campaigns can be edited");
  }
  return exports.getCampaign(id, db);
};

exports.deleteCampaign = async (id, db = prisma) => {
  const deleted = await db.newsletterCampaign.deleteMany({
    where: { id, status: { in: ["DRAFT", "COMPLETED"] } },
  });
  if (!deleted.count) {
    await exports.getCampaign(id, db);
    throw new AppError(409, "Wait until the campaign finishes before deleting it");
  }
};

exports.queueCampaign = async (id, input, db = prisma) => {
  mail.assertConfigured();
  const ids = input.mode === "SELECTED" ? [...new Set(input.subscriberIds)] : null;
  const result = await db.$transaction(async (tx) => {
    const claimed = await tx.newsletterCampaign.updateMany({ where: { id, status: "DRAFT" }, data: { status: "QUEUED", mode: input.mode, queuedAt: new Date() } });
    if (!claimed.count) throw new AppError(409, "This campaign is not an unsent draft");
    const subscribers = await tx.newsletterSubscriber.findMany({
      where: { status: "ACTIVE", ...(ids ? { id: { in: ids } } : {}) },
      select: { id: true, email: true },
    });
    if (!subscribers.length || (ids && subscribers.length !== ids.length)) {
      throw new AppError(400, "Choose at least one active subscriber. Selected recipients must all be active.");
    }
    await tx.newsletterDelivery.createMany({
      data: subscribers.map((subscriber) => ({ campaignId: id, subscriberId: subscriber.id, email: subscriber.email })),
    });
    return subscribers.length;
  }, { timeout: 20000 });
  return { queued: result };
};

exports.unsubscribeToken = unsubscribeToken;
