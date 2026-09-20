const { z } = require("zod");

const email = z.string().trim().toLowerCase().email().max(191);
const token = z.string().regex(/^[a-f0-9]{64}$|^[1-9]\d*\.[a-f0-9]{64}$/);
const idParams = z.object({ id: z.coerce.number().int().positive() });
const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(191).optional(),
  status: z.enum(["PENDING", "ACTIVE", "UNSUBSCRIBED"]).optional(),
}).strict();
const deliveryQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "SENDING", "SENT", "FAILED", "SKIPPED"]).optional(),
}).strict();

const publicSubscribe = z.object({
  email,
  consent: z.literal(true),
  website: z.string().max(200).default(""),
}).strict();
const tokenBody = z.object({ token }).strict();
const unsubscribeQuery = z.object({ token });
const adminCreateSubscriber = z.object({ email }).strict();
const adminUpdateSubscriber = z.object({
  email: email.optional(),
  status: z.literal("UNSUBSCRIBED").optional(),
}).strict().refine((value) => (value.email !== undefined) !== (value.status !== undefined), "Change the email or unsubscribe in one request");
const campaignBody = z.object({
  subject: z.string().trim().min(3).max(191).refine((value) => !/[\r\n]/.test(value), "Use a single-line subject"),
  body: z.string().trim().min(20).max(20000),
}).strict();
const sendCampaign = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("ALL") }).strict(),
  z.object({ mode: z.literal("SELECTED"), subscriberIds: z.array(z.number().int().positive()).min(1).max(10000) }).strict(),
]);

module.exports = {
  idParams, listQuery, deliveryQuery, publicSubscribe, tokenBody, unsubscribeQuery,
  adminCreateSubscriber, adminUpdateSubscriber, campaignBody, sendCampaign,
};
