const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const slugify = require("../utils/slugify");

const detailInclude = { tags: { orderBy: { sortOrder: "asc" }, include: { tag: true } }, images: { where: { sectionId: null }, orderBy: { sortOrder: "asc" } }, sections: { orderBy: { sortOrder: "asc" }, include: { paragraphs: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } } } };
const listInclude = { tags: { orderBy: { sortOrder: "asc" }, include: { tag: true } } };
const serialize = (blog) => blog && ({ ...blog, tags: blog.tags?.map((assignment) => ({ ...assignment.tag, sortOrder: assignment.sortOrder })) || [] });
const nullable = (value) => value === "" ? null : value;
const scalar = (data) => { const keys = ["title","excerpt","category","coverImageUrl","coverImagePublicId","coverImageAltText","authorName","authorRole","authorImageUrl","authorImagePublicId","readTimeMinutes","isFeatured","status","sortOrder","seoTitle","seoDescription","canonicalUrl"]; const result = {}; for (const key of keys) if (data[key] !== undefined) result[key] = nullable(data[key]); if (data.publishedAt !== undefined) result.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null; return result; };
const uniqueSlug = async (requested, title, excludeId) => { const base = slugify(requested || title) || `post-${Date.now()}`; let value = base; let suffix = 2; while (await prisma.blog.findFirst({ where: { slug: value, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) value = `${base}-${suffix++}`; return value; };
const orderedImages = (images = []) => images.map((item, sortOrder) => ({ ...item, sortOrder }));

async function createRelations(tx, blogId, data) {
  for (const [sortOrder, name] of [...new Set(data.tags || [])].entries()) {
    const tag = await tx.blogTag.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } });
    await tx.blogTagAssignment.create({ data: { blogId, tagId: tag.id, sortOrder } });
  }
  const gallery = orderedImages(data.galleryImages); if (gallery.length) await tx.blogImage.createMany({ data: gallery.map((image) => ({ ...image, blogId })) });
  for (const [sortOrder, item] of (data.sections || []).entries()) {
    const section = await tx.blogSection.create({ data: { blogId, heading: item.heading, sortOrder } });
    if (item.paragraphs.length) await tx.blogParagraph.createMany({ data: item.paragraphs.map((content, index) => ({ sectionId: section.id, content, sortOrder: index })) });
    if (item.images.length) await tx.blogImage.createMany({ data: orderedImages(item.images).map((image) => ({ ...image, blogId, sectionId: section.id })) });
  }
}

exports.create = async (data) => prisma.$transaction(async (tx) => {
  const blog = await tx.blog.create({ data: { ...scalar(data), slug: await uniqueSlug(data.slug, data.title), publishedAt: data.status === "PUBLISHED" ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : null } });
  await createRelations(tx, blog.id, data); return serialize(await tx.blog.findUnique({ where: { id: blog.id }, include: detailInclude }));
});

async function list(query, isAdmin) {
  const { page, limit, category, status, featured, search, sortBy, sortOrder, tag } = query;
  const where = { ...(!isAdmin ? { status: "PUBLISHED" } : status ? { status } : {}), ...(category ? { category } : {}), ...(featured !== undefined ? { isFeatured: featured } : {}), ...(tag ? { tags: { some: { tag: { slug: slugify(tag) } } } } : {}), ...(search ? { OR: [{ title: { contains: search } }, { excerpt: { contains: search } }, { category: { contains: search } }] } : {}) };
  const [totalItems, rows] = await prisma.$transaction([prisma.blog.count({ where }), prisma.blog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }], include: listInclude })]);
  const totalPages = Math.ceil(totalItems / limit); return { data: rows.map(serialize), pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
}
exports.listPublic = (query) => list(query, false); exports.listAdmin = (query) => list(query, true);
exports.getPublic = async (slug) => { const blog = await prisma.blog.findFirst({ where: { slug, status: "PUBLISHED" }, include: detailInclude }); if (!blog) throw new AppError(404, "Blog post not found"); return serialize(blog); };
exports.getAdmin = async (id) => { const blog = await prisma.blog.findUnique({ where: { id }, include: detailInclude }); if (!blog) throw new AppError(404, "Blog post not found"); return serialize(blog); };
exports.update = async (id, data) => { const existing = await prisma.blog.findUnique({ where: { id } }); if (!existing) throw new AppError(404, "Blog post not found"); const nextPublished = data.status === "PUBLISHED" && existing.status !== "PUBLISHED" ? new Date() : data.status && data.status !== "PUBLISHED" ? null : undefined; return prisma.$transaction(async (tx) => { const changes = { ...scalar(data), ...(data.slug ? { slug: await uniqueSlug(data.slug, data.title || existing.title, id) } : {}) }; if (nextPublished !== undefined) changes.publishedAt = nextPublished; await tx.blog.update({ where: { id }, data: changes }); if (data.tags !== undefined) { await tx.blogTagAssignment.deleteMany({ where: { blogId: id } }); for (const [sortOrder, name] of [...new Set(data.tags)].entries()) { const tag = await tx.blogTag.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } }); await tx.blogTagAssignment.create({ data: { blogId: id, tagId: tag.id, sortOrder } }); } } if (data.galleryImages !== undefined) { await tx.blogImage.deleteMany({ where: { blogId: id, sectionId: null } }); const images = orderedImages(data.galleryImages); if (images.length) await tx.blogImage.createMany({ data: images.map((image) => ({ ...image, blogId: id })) }); } if (data.sections !== undefined) { await tx.blogSection.deleteMany({ where: { blogId: id } }); await createRelations(tx, id, { sections: data.sections, tags: [], galleryImages: [] }); } return serialize(await tx.blog.findUnique({ where: { id }, include: detailInclude })); }); };
exports.remove = async (id) => { if (!await prisma.blog.findUnique({ where: { id }, select: { id: true } })) throw new AppError(404, "Blog post not found"); await prisma.blog.delete({ where: { id } }); };
exports.incrementViews = async (slug) => { const result = await prisma.blog.updateMany({ where: { slug, status: "PUBLISHED" }, data: { views: { increment: 1 } } }); if (!result.count) throw new AppError(404, "Blog post not found"); };
exports.related = async (slug, limit) => { const current = await prisma.blog.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true, category: true, tags: { select: { tagId: true } } } }); if (!current) throw new AppError(404, "Blog post not found"); const tagIds = current.tags.map((x) => x.tagId); const rows = await prisma.blog.findMany({ where: { id: { not: current.id }, status: "PUBLISHED", OR: [{ category: current.category }, ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds } } } }] : [])] }, take: limit, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], include: listInclude }); if (rows.length < limit) { const extra = await prisma.blog.findMany({ where: { id: { notIn: [current.id, ...rows.map((x) => x.id)] }, status: "PUBLISHED" }, take: limit - rows.length, orderBy: { publishedAt: "desc" }, include: listInclude }); rows.push(...extra); } return rows.map(serialize); };
exports.categories = async () => (await prisma.blog.findMany({ where: { status: "PUBLISHED" }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } })).map((x) => x.category);
exports.tags = async () => prisma.blogTag.findMany({ where: { blogs: { some: { blog: { status: "PUBLISHED" } } } }, orderBy: { name: "asc" } });
exports.stats = async () => { const [total,published,drafts,archived,featured,views,recent] = await prisma.$transaction([prisma.blog.count(),prisma.blog.count({where:{status:"PUBLISHED"}}),prisma.blog.count({where:{status:"DRAFT"}}),prisma.blog.count({where:{status:"ARCHIVED"}}),prisma.blog.count({where:{isFeatured:true}}),prisma.blog.aggregate({_sum:{views:true}}),prisma.blog.findMany({take:5,orderBy:{updatedAt:"desc"},select:{id:true,slug:true,title:true,category:true,coverImageUrl:true,status:true,views:true,updatedAt:true}})]); return {total,published,drafts,archived,featured,views:views._sum.views||0,recent}; };
