const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const createSlug = require("../utils/slugify");

const detailInclude = {
  technologies: { orderBy: { sortOrder: "asc" } },
  services: { orderBy: { sortOrder: "asc" } },
  images: { where: { sectionId: null }, orderBy: { sortOrder: "asc" } },
  sections: {
    orderBy: { sortOrder: "asc" },
    include: {
      paragraphs: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  },
};

const normalizeNullable = (value) => (value === "" ? null : value);

const scalarData = (data) => {
  const scalarKeys = [
    "title", "category", "shortDescription", "overview", "coverImageUrl",
    "coverImagePublicId", "coverImageAltText", "client", "timeline", "teamSize",
    "results", "projectUrl", "isFeatured", "status", "sortOrder",
  ];
  const result = {};

  for (const key of scalarKeys) {
    if (data[key] !== undefined) result[key] = normalizeNullable(data[key]);
  }
  if (data.completedAt !== undefined) {
    result.completedAt = data.completedAt ? new Date(data.completedAt) : null;
  }
  return result;
};

const orderedNames = (names = []) =>
  [...new Set(names)].map((name, sortOrder) => ({ name, sortOrder }));

const orderedImages = (images = []) =>
  images.map((image, sortOrder) => ({ ...image, sortOrder }));

const uniqueSlug = async (requestedSlug, title, excludeId) => {
  const base = createSlug(requestedSlug || title) || `work-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.work.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
};

const setPublicationDate = (data, existingStatus) => {
  if (data.status === "PUBLISHED" && existingStatus !== "PUBLISHED") return new Date();
  if (data.status && data.status !== "PUBLISHED") return null;
  return undefined;
};

exports.createWork = async (data) => {
  const slug = await uniqueSlug(data.slug, data.title);
  const publishedAt = data.status === "PUBLISHED" ? new Date() : null;

  return prisma.$transaction(async (tx) => {
    const work = await tx.work.create({
      data: { ...scalarData(data), slug, publishedAt },
    });

    const technologies = orderedNames(data.technologies);
    const services = orderedNames(data.services);
    const galleryImages = orderedImages(data.galleryImages);
    if (technologies.length) {
      await tx.workTechnology.createMany({
        data: technologies.map((item) => ({ ...item, workId: work.id })),
      });
    }
    if (services.length) {
      await tx.workService.createMany({
        data: services.map((item) => ({ ...item, workId: work.id })),
      });
    }
    if (galleryImages.length) {
      await tx.workImage.createMany({
        data: galleryImages.map((image) => ({ ...image, workId: work.id })),
      });
    }

    for (const [sortOrder, sectionData] of data.sections.entries()) {
      const section = await tx.workSection.create({
        data: { workId: work.id, heading: sectionData.heading, sortOrder },
      });
      if (sectionData.paragraphs.length) {
        await tx.workParagraph.createMany({
          data: sectionData.paragraphs.map((content, paragraphOrder) => ({
            sectionId: section.id,
            content,
            sortOrder: paragraphOrder,
          })),
        });
      }
      if (sectionData.images.length) {
        await tx.workImage.createMany({
          data: orderedImages(sectionData.images).map((image) => ({
            ...image,
            workId: work.id,
            sectionId: section.id,
          })),
        });
      }
    }

    return tx.work.findUnique({ where: { id: work.id }, include: detailInclude });
  });
};

exports.listWorks = async (query) => {
  const { page, limit, category, status, featured, search, sortBy, sortOrder } = query;
  const where = {
    status,
    ...(category ? { category } : {}),
    ...(featured !== undefined ? { isFeatured: featured } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { shortDescription: { contains: search } },
            { category: { contains: search } },
          ],
        }
      : {}),
  };

  const [totalItems, works] = await prisma.$transaction([
    prisma.work.count({ where }),
    prisma.work.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
      include: {
        technologies: { orderBy: { sortOrder: "asc" } },
        services: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: works,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

exports.listAdminWorks = async (query) => {
  const { page, limit, category, status, featured, search, sortBy, sortOrder } = query;
  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(featured !== undefined ? { isFeatured: featured } : {}),
    ...(search ? { OR: [
      { title: { contains: search } }, { shortDescription: { contains: search } },
      { category: { contains: search } },
    ] } : {}),
  };
  const [totalItems, works] = await prisma.$transaction([
    prisma.work.count({ where }),
    prisma.work.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
      include: {
        technologies: { orderBy: { sortOrder: "asc" } },
        services: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);
  const totalPages = Math.ceil(totalItems / limit);
  return { data: works, pagination: {
    page, limit, totalItems, totalPages,
    hasNextPage: page < totalPages, hasPreviousPage: page > 1,
  } };
};

exports.getAdminWorkById = async (id) => {
  const work = await prisma.work.findUnique({ where: { id }, include: detailInclude });
  if (!work) throw new AppError(404, "Work not found");
  return work;
};

exports.getAdminWorkStats = async () => {
  const [total, published, drafts, archived, featured, recent] = await prisma.$transaction([
    prisma.work.count(),
    prisma.work.count({ where: { status: "PUBLISHED" } }),
    prisma.work.count({ where: { status: "DRAFT" } }),
    prisma.work.count({ where: { status: "ARCHIVED" } }),
    prisma.work.count({ where: { isFeatured: true } }),
    prisma.work.findMany({ take: 5, orderBy: { updatedAt: "desc" }, select: {
      id: true, slug: true, title: true, category: true, coverImageUrl: true,
      status: true, updatedAt: true,
    } }),
  ]);
  return { total, published, drafts, archived, featured, recent };
};

exports.getPublishedWorkBySlug = async (slug) => {
  const work = await prisma.work.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: detailInclude,
  });
  if (!work) throw new AppError(404, "Work not found");
  return work;
};

exports.updateWork = async (id, data) => {
  const existing = await prisma.work.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Work not found");

  const nextSlug = data.slug
    ? await uniqueSlug(data.slug, data.title || existing.title, id)
    : existing.slug;
  const publishedAt = setPublicationDate(data, existing.status);

  return prisma.$transaction(async (tx) => {
    const updateData = { ...scalarData(data), slug: nextSlug };
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt;

    await tx.work.update({ where: { id }, data: updateData });

    if (data.technologies !== undefined) {
      await tx.workTechnology.deleteMany({ where: { workId: id } });
      if (data.technologies.length) {
        await tx.workTechnology.createMany({
          data: orderedNames(data.technologies).map((item) => ({ ...item, workId: id })),
        });
      }
    }
    if (data.services !== undefined) {
      await tx.workService.deleteMany({ where: { workId: id } });
      if (data.services.length) {
        await tx.workService.createMany({
          data: orderedNames(data.services).map((item) => ({ ...item, workId: id })),
        });
      }
    }
    if (data.galleryImages !== undefined) {
      await tx.workImage.deleteMany({ where: { workId: id, sectionId: null } });
      if (data.galleryImages.length) {
        await tx.workImage.createMany({
          data: orderedImages(data.galleryImages).map((image) => ({ ...image, workId: id })),
        });
      }
    }
    if (data.sections !== undefined) {
      await tx.workSection.deleteMany({ where: { workId: id } });
      for (const [sortOrder, section] of data.sections.entries()) {
        const createdSection = await tx.workSection.create({
          data: { workId: id, heading: section.heading, sortOrder },
        });
        if (section.paragraphs.length) {
          await tx.workParagraph.createMany({
            data: section.paragraphs.map((content, order) => ({
              sectionId: createdSection.id,
              content,
              sortOrder: order,
            })),
          });
        }
        if (section.images.length) {
          await tx.workImage.createMany({
            data: orderedImages(section.images).map((image) => ({
              ...image,
              workId: id,
              sectionId: createdSection.id,
            })),
          });
        }
      }
    }

    return tx.work.findUnique({ where: { id }, include: detailInclude });
  });
};

exports.deleteWork = async (id) => {
  const existing = await prisma.work.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError(404, "Work not found");
  await prisma.work.delete({ where: { id } });
};

exports.listCategories = async () => {
  const categories = await prisma.work.findMany({
    where: { status: "PUBLISHED" },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return categories.map(({ category }) => category);
};
