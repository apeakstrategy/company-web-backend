const { z } = require("zod");
const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const assetUrl = z.union([z.url().max(2048), z.string().trim().max(2048).regex(/^\/assets\/[A-Za-z0-9_./%()-]+$/)]);
const optionalUrl = z.union([z.url().max(2048), z.literal(""), z.null()]).optional();
const image = z.object({ url: assetUrl, publicId: optionalText(255), altText: z.string().trim().min(1).max(255), caption: optionalText(500), width: z.number().int().positive().nullable().optional(), height: z.number().int().positive().nullable().optional() });
const section = z.object({ heading: z.string().trim().min(1).max(191), paragraphs: z.array(z.string().trim().min(1).max(30000)).max(100).default([]), images: z.array(image).max(50).default([]) });
const fields = {
  slug: z.string().trim().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), title: z.string().trim().min(1).max(191),
  excerpt: z.string().trim().min(1).max(500), category: z.string().trim().min(1).max(100), coverImageUrl: assetUrl,
  coverImagePublicId: optionalText(255), coverImageAltText: optionalText(255), authorName: z.string().trim().min(1).max(120),
  authorRole: optionalText(120), authorImageUrl: z.union([assetUrl, z.literal(""), z.null()]).optional(), authorImagePublicId: optionalText(255),
  readTimeMinutes: z.number().int().min(1).max(180), isFeatured: z.boolean(), status, sortOrder: z.number().int().min(0),
  seoTitle: optionalText(70), seoDescription: optionalText(170), canonicalUrl: optionalUrl,
  publishedAt: z.iso.datetime({ offset: true }).nullable().optional(), tags: z.array(z.string().trim().min(1).max(100)).max(30),
  sections: z.array(section).max(100), galleryImages: z.array(image).max(100),
};
const createBlogSchema = z.object(fields).strict();
const updateBlogSchema = z.object(fields).partial().strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");
const idParams = z.object({ id: z.coerce.number().int().positive() });
const slugParams = z.object({ slug: z.string().trim().min(1).max(191) });
const publicList = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(50).default(9), category: z.string().trim().min(1).max(100).optional(), tag: z.string().trim().min(1).max(100).optional(), featured: z.enum(["true", "false"]).transform((v) => v === "true").optional(), search: z.string().trim().min(1).max(191).optional(), sortBy: z.enum(["publishedAt", "createdAt", "title", "sortOrder", "views"]).default("publishedAt"), sortOrder: z.enum(["asc", "desc"]).default("desc") }).strict();
const adminList = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(10), category: z.string().trim().min(1).max(100).optional(), status: status.optional(), featured: z.enum(["true", "false"]).transform((v) => v === "true").optional(), search: z.string().trim().min(1).max(191).optional(), sortBy: z.enum(["updatedAt", "publishedAt", "createdAt", "title", "sortOrder", "views"]).default("updatedAt"), sortOrder: z.enum(["asc", "desc"]).default("desc") }).strict();
const relatedQuery = z.object({ limit: z.coerce.number().int().min(1).max(12).default(3) }).strict();

module.exports = { createBlogSchema, updateBlogSchema, idParams, slugParams, publicList, adminList, relatedQuery };
