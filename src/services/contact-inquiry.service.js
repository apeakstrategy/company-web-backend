const crypto = require("crypto");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const mail = require("./contact-mail.service");

const include = { replies: { orderBy: { createdAt: "asc" }, include: { admin: { select: { id: true, name: true, email: true } } } } };
const cleanError = (error) => String(error?.message || "Email delivery failed").slice(0, 1000);
const makeReference = () => `APS-${new Date().toISOString().slice(0, 7).replace("-", "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const hashIp = (ip) => crypto.createHmac("sha256", process.env.CONTACT_IP_HASH_SECRET || process.env.JWT_SECRET || "development-only").update(ip || "unknown").digest("hex");

async function verifyTurnstile(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new AppError(503, "Contact form verification is not configured");
    return;
  }
  if (!token) throw new AppError(400, "Please complete the security check");
  let response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token, remoteip: remoteip || "" }), signal: AbortSignal.timeout(8000) });
  } catch (_error) { throw new AppError(503, "Security verification is temporarily unavailable"); }
  const result = await response.json();
  if (!result.success) throw new AppError(400, "Security verification failed. Please try again");
}

exports.submit = async (input, request) => {
  const elapsed = Date.now() - new Date(input.formStartedAt).getTime();
  if (elapsed < 3000 || elapsed > 86400000) throw new AppError(400, "Please reload the form and try again");
  await verifyTurnstile(input.turnstileToken, request.ip);
  const duplicate = await prisma.contactInquiry.findFirst({ where: { email: input.email, message: input.message, createdAt: { gte: new Date(Date.now() - 600000) } }, select: { reference: true } });
  if (duplicate) throw new AppError(429, `This message was already received (${duplicate.reference})`);
  const inquiry = await prisma.contactInquiry.create({ data: { reference: makeReference(), name: input.name, email: input.email, subject: input.subject, message: input.message, source: "website", ipHash: hashIp(request.ip), userAgent: String(request.get("user-agent") || "").slice(0, 500) || null } });
  try {
    await mail.sendNotification(inquiry);
    await prisma.contactInquiry.update({ where: { id: inquiry.id }, data: { notificationStatus: "SENT", notificationError: null } });
  } catch (error) {
    console.error("Contact notification failed", inquiry.reference, cleanError(error));
    await prisma.contactInquiry.update({ where: { id: inquiry.id }, data: { notificationStatus: "FAILED", notificationError: cleanError(error) } });
  }
  if (process.env.SEND_CONTACT_CONFIRMATION !== "false") mail.sendConfirmation(inquiry).catch((error) => console.error("Contact confirmation failed", inquiry.reference, cleanError(error)));
  return { reference: inquiry.reference };
};

exports.list = async ({ page, limit, search, status, priority, notificationStatus, sortOrder }) => {
  const where = { ...(status && { status }), ...(priority && { priority }), ...(notificationStatus && { notificationStatus }), ...(search && { OR: ["reference", "name", "email", "subject"].map((field) => ({ [field]: { contains: search } })) }) };
  const [totalItems, data] = await prisma.$transaction([prisma.contactInquiry.count({ where }), prisma.contactInquiry.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: sortOrder }, select: { id:true,reference:true,name:true,email:true,subject:true,status:true,priority:true,notificationStatus:true,lastRepliedAt:true,createdAt:true,updatedAt:true } })]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { data, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

exports.stats = async () => {
  const [total, unread, inProgress, replied, failed, recent] = await prisma.$transaction([prisma.contactInquiry.count(), prisma.contactInquiry.count({ where: { status: "NEW" } }), prisma.contactInquiry.count({ where: { status: "IN_PROGRESS" } }), prisma.contactInquiry.count({ where: { status: "REPLIED" } }), prisma.contactInquiry.count({ where: { notificationStatus: "FAILED" } }), prisma.contactInquiry.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id:true,reference:true,name:true,email:true,subject:true,status:true,priority:true,createdAt:true } })]);
  return { total, unread, inProgress, replied, failed, recent };
};

exports.get = async (id) => {
  let inquiry = await prisma.contactInquiry.findUnique({ where: { id }, include });
  if (!inquiry) throw new AppError(404, "Inquiry not found");
  if (inquiry.status === "NEW") inquiry = await prisma.contactInquiry.update({ where: { id }, data: { status: "READ" }, include });
  return inquiry;
};
exports.update = async (id, input) => { await exports.get(id); return prisma.contactInquiry.update({ where: { id }, data: { ...input, archivedAt: input.status === "ARCHIVED" ? new Date() : input.status ? null : undefined }, include }); };
exports.reply = async (id, adminId, input) => {
  const inquiry = await exports.get(id);
  const reply = await prisma.contactReply.create({ data: { inquiryId: id, adminId, subject: input.subject, message: input.message } });
  try {
    const info = await mail.sendReply(inquiry, input.subject, input.message);
    await prisma.$transaction([prisma.contactReply.update({ where: { id: reply.id }, data: { deliveryStatus: "SENT", providerMessageId: String(info.messageId || "").slice(0, 191) || null, sentAt: new Date() } }), prisma.contactInquiry.update({ where: { id }, data: { status: "REPLIED", lastRepliedAt: new Date() } })]);
  } catch (error) {
    await prisma.contactReply.update({ where: { id: reply.id }, data: { deliveryStatus: "FAILED", deliveryError: cleanError(error) } });
    throw new AppError(502, "The reply was saved, but email delivery failed. Please check SMTP settings and try again");
  }
  return exports.get(id);
};
exports.resendNotification = async (id) => {
  const inquiry = await exports.get(id);
  try { await mail.sendNotification(inquiry); return prisma.contactInquiry.update({ where: { id }, data: { notificationStatus: "SENT", notificationError: null } }); }
  catch (error) { await prisma.contactInquiry.update({ where: { id }, data: { notificationStatus: "FAILED", notificationError: cleanError(error) } }); throw new AppError(502, "Notification delivery failed. Please check SMTP settings"); }
};
exports.remove = async (id) => { await exports.get(id); await prisma.contactInquiry.delete({ where: { id } }); };
