const { z } = require("zod");

const statusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const optionalUrl = z.union([z.url().max(2048), z.literal(""), z.null()]).optional();
const imageUrlSchema = z.union([
  z.url().max(2048),
  z.string().trim().max(2048).regex(
    /^\/assets\/[A-Za-z0-9_./%()-]+$/,
    "Image must be an absolute URL or a valid /assets/ path"
  ),
]);

const imageSchema = z.object({
  url: imageUrlSchema,
  publicId: optionalText(255),
  altText: z.string().trim().min(1).max(255),
  caption: optionalText(500),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

const sectionSchema = z.object({
  heading: z.string().trim().min(1).max(191),
  paragraphs: z.array(z.string().trim().min(1).max(20000)).max(50).default([]),
  images: z.array(imageSchema).max(50).default([]),
});

const workFields = {
  slug: z
    .string()
    .trim()
    .min(1)
    .max(191)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens")
    .optional(),
  title: z.string().trim().min(1).max(191),
  category: z.string().trim().min(1).max(100),
  shortDescription: z.string().trim().min(1).max(500),
  overview: optionalText(30000),
  coverImageUrl: imageUrlSchema,
  coverImagePublicId: optionalText(255),
  coverImageAltText: optionalText(255),
  client: optionalText(191),
  timeline: optionalText(100),
  teamSize: optionalText(100),
  results: optionalText(500),
  projectUrl: optionalUrl,
  completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: statusSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  technologies: z.array(z.string().trim().min(1).max(100)).max(50),
  services: z.array(z.string().trim().min(1).max(100)).max(50),
  sections: z.array(sectionSchema).max(50),
  galleryImages: z.array(imageSchema).max(100),
};

const createWorkSchema = z.object({
  ...workFields,
  technologies: workFields.technologies.default([]),
  services: workFields.services.default([]),
  sections: workFields.sections.default([]),
  galleryImages: workFields.galleryImages.default([]),
}).strict();
const updateWorkSchema = z.object(workFields).partial().strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const slugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(191),
});

const listWorksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  category: z.string().trim().min(1).max(100).optional(),
  status: statusSchema.default("PUBLISHED"),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  search: z.string().trim().min(1).max(191).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "title", "sortOrder"]).default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

const adminListWorksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.string().trim().min(1).max(100).optional(),
  status: statusSchema.optional(),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  search: z.string().trim().min(1).max(191).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "title", "sortOrder"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

module.exports = {
  createWorkSchema,
  updateWorkSchema,
  idParamsSchema,
  slugParamsSchema,
  listWorksSchema,
  adminListWorksSchema,
};
