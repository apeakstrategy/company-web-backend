const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const withWork = { work: { select: { id: true, title: true, slug: true, status: true } } };

async function requirePublishedWork(workId, db) {
  if (workId === null) return;
  const work = await db.work.findUnique({ where: { id: workId }, select: { id: true, status: true } });
  if (!work || work.status !== "PUBLISHED") {
    throw new AppError(400, "Choose a published project or leave the project link empty");
  }
}

exports.listPublic = async (db = prisma) => {
  const testimonials = await db.testimonial.findMany({
    where: { status: "PUBLISHED", consentConfirmed: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 30,
    include: withWork,
  });
  return testimonials.map((item) => ({
    id: item.id,
    clientName: item.clientName,
    attribution: item.attribution,
    quote: item.quote,
    project: item.work?.status === "PUBLISHED"
      ? { title: item.work.title, slug: item.work.slug }
      : null,
  }));
};

exports.listAdmin = async ({ page, limit, search, status }, db = prisma) => {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { OR: [
      { clientName: { contains: search } },
      { attribution: { contains: search } },
      { quote: { contains: search } },
    ] } : {}),
  };
  const [totalItems, data] = await db.$transaction([
    db.testimonial.count({ where }),
    db.testimonial.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      include: withWork,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { data, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

exports.projectOptions = (db = prisma) => db.work.findMany({
  where: { status: "PUBLISHED" },
  select: { id: true, title: true, slug: true },
  orderBy: { title: "asc" },
  take: 200,
});

exports.getAdmin = async (id, db = prisma) => {
  const testimonial = await db.testimonial.findUnique({ where: { id }, include: withWork });
  if (!testimonial) throw new AppError(404, "Testimonial not found");
  return testimonial;
};

exports.create = async (input, db = prisma) => {
  await requirePublishedWork(input.workId, db);
  return db.testimonial.create({ data: input, include: withWork });
};

exports.update = async (id, input, db = prisma) => {
  await exports.getAdmin(id, db);
  await requirePublishedWork(input.workId, db);
  return db.testimonial.update({ where: { id }, data: input, include: withWork });
};

exports.remove = async (id, db = prisma) => {
  await exports.getAdmin(id, db);
  await db.testimonial.delete({ where: { id } });
};
