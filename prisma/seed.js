require("dotenv").config();
const prisma = require("../src/config/prisma");

const works = [
  ["Luxury Fashion Brand", "Branding", "Complete brand transformation for high-end fashion label", "/assets/work1.jpg"],
  ["Tech Startup Website", "Web Development", "Modern, fast, and elegant web experience", "/assets/work2.jpg"],
  ["Restaurant Campaign", "Advertising", "Multi-channel advertising campaign", "/assets/work3.jpg"],
  ["Product Photography", "Photography", "Luxury product shoot for premium cosmetics", "/assets/work4.jpg"],
  ["Corporate Event", "Event Management", "Annual gala for Fortune 500 company", "/assets/work5.jpg"],
  ["Social Media Strategy", "Social Media", "Complete social media overhaul and growth", "/assets/work6.jpg"],
].map(([title, category, shortDescription, coverImageUrl], index) => ({
  title,
  category,
  shortDescription,
  coverImageUrl,
  client: "Premium Brand",
  timeline: "3 Months",
  teamSize: "4 Members",
  results: "+45% Conversions",
  isFeatured: index === 0,
  services: ["Strategy", "Design", "Development", "Marketing"],
  technologies: ["React", "Next.js", "TypeScript", "Tailwind", "Node.js", "MySQL"],
}));

const slugify = require("../src/utils/slugify");

async function main() {
  for (const [sortOrder, item] of works.entries()) {
    const slug = slugify(item.title);
    await prisma.$transaction(async (tx) => {
      const work = await tx.work.upsert({
        where: { slug },
        update: {
          title: item.title,
          category: item.category,
          shortDescription: item.shortDescription,
          coverImageUrl: item.coverImageUrl,
          coverImageAltText: item.title,
          client: item.client,
          timeline: item.timeline,
          teamSize: item.teamSize,
          results: item.results,
          isFeatured: item.isFeatured,
          sortOrder,
        },
        create: {
          slug,
          title: item.title,
          category: item.category,
          shortDescription: item.shortDescription,
          overview: item.shortDescription,
          coverImageUrl: item.coverImageUrl,
          coverImageAltText: item.title,
          client: item.client,
          timeline: item.timeline,
          teamSize: item.teamSize,
          results: item.results,
          isFeatured: item.isFeatured,
          status: "PUBLISHED",
          publishedAt: new Date(),
          sortOrder,
        },
      });

      await tx.workService.deleteMany({ where: { workId: work.id } });
      await tx.workTechnology.deleteMany({ where: { workId: work.id } });
      await tx.workService.createMany({
        data: item.services.map((name, serviceOrder) => ({
          workId: work.id,
          name,
          sortOrder: serviceOrder,
        })),
      });
      await tx.workTechnology.createMany({
        data: item.technologies.map((name, technologyOrder) => ({
          workId: work.id,
          name,
          sortOrder: technologyOrder,
        })),
      });
    });
  }
}

main()
  .then(() => console.log(`Seeded ${works.length} works`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
