const { z } = require("zod");

const testimonialBody = z.object({
  clientName: z.string().trim().min(2).max(120),
  attribution: z.string().trim().min(2).max(160),
  quote: z.string().trim().min(20).max(2000),
  workId: z.number().int().positive().nullable().default(null),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  consentConfirmed: z.boolean().default(false),
}).strict().refine(
  (data) => data.status !== "PUBLISHED" || data.consentConfirmed,
  { path: ["consentConfirmed"], message: "Confirm permission before publishing this testimonial" }
);

const testimonialList = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
}).strict();

const idParams = z.object({ id: z.coerce.number().int().positive() });

module.exports = { testimonialBody, testimonialList, idParams };
