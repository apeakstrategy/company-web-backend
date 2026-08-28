const { z } = require("zod");
const noHeaders = (max) => z.string().trim().min(1).max(max).refine((value) => !/[\r\n]/.test(value), "Line breaks are not allowed");
const submitContact = z.object({
  name: noHeaders(120).min(2),
  email: z.string().trim().toLowerCase().email().max(191),
  subject: noHeaders(191).min(3),
  message: z.string().trim().min(20).max(10000),
  website: z.string().max(0).optional().default(""),
  formStartedAt: z.iso.datetime({ offset: true }),
  turnstileToken: z.string().max(2048).optional().default(""),
}).strict();
const statuses = z.enum(["NEW","READ","IN_PROGRESS","REPLIED","ARCHIVED","SPAM"]);
const priorities = z.enum(["LOW","NORMAL","HIGH","URGENT"]);
const adminList = z.object({ page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().min(1).max(100).default(20),status:statuses.optional(),priority:priorities.optional(),search:z.string().trim().min(1).max(191).optional(),notificationStatus:z.enum(["PENDING","SENT","FAILED"]).optional(),sortOrder:z.enum(["asc","desc"]).default("desc") }).strict();
const idParams = z.object({ id:z.coerce.number().int().positive() });
const updateInquiry = z.object({ status:statuses.optional(),priority:priorities.optional() }).strict().refine((value)=>Object.keys(value).length>0,"At least one field is required");
const reply = z.object({ subject:noHeaders(191).min(3),message:z.string().trim().min(10).max(20000) }).strict();
module.exports={submitContact,adminList,idParams,updateInquiry,reply};
