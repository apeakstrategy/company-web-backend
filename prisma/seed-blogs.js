require("dotenv").config();
const prisma = require("../src/config/prisma");
const slugify = require("../src/utils/slugify");

const posts = [
  ["The Future of Digital Transformation in 2024","Exploring the latest trends and technologies shaping the future of business digital transformation and strategic innovation.","Technology","/assets/blog-tech.jpg","2024-03-15"],
  ["Building Brands That Connect Emotionally","How to create brand experiences that resonate deeply with your audience and drive meaningful engagement.","Strategy","/assets/blog-branding.jpg","2024-03-12"],
  ["AI-Powered Marketing Strategies for Growth","Leveraging artificial intelligence to optimize marketing campaigns and drive unprecedented business growth.","Marketing","/assets/blog-ai.jpg","2024-03-10"],
  ["The Psychology of User Experience Design","Understanding cognitive principles to create intuitive and engaging digital experiences that convert.","Design","/assets/blog-ux.jpg","2024-03-08"],
  ["Sustainable Business Models for Modern Enterprises","How to build resilient and sustainable business models that thrive in today's competitive landscape.","Business","/assets/blog-business.jpg","2024-03-05"],
  ["Innovation Through Cross-Industry Collaboration","Breaking down industry silos to foster innovation and create breakthrough solutions for complex challenges.","Innovation","/assets/blog-innovation.jpg","2024-03-03"],
];

async function main() {
  for (const [sortOrder, [title,excerpt,category,coverImageUrl,date]] of posts.entries()) {
    const slug = slugify(title);
    const blog = await prisma.blog.upsert({ where:{slug}, update:{title,excerpt,category,coverImageUrl,sortOrder}, create:{slug,title,excerpt,category,coverImageUrl,coverImageAltText:title,authorName:"A Peak Strategy Team",authorRole:"Strategic Experts",readTimeMinutes:5,isFeatured:sortOrder===0,status:"PUBLISHED",publishedAt:new Date(`${date}T00:00:00Z`),sortOrder,seoTitle:title.slice(0,70),seoDescription:excerpt.slice(0,170)} });
    if (await prisma.blogSection.count({where:{blogId:blog.id}}) === 0) {
      await prisma.blogSection.create({ data:{blogId:blog.id,heading:"Overview",sortOrder:0,paragraphs:{create:[{content:excerpt,sortOrder:0},{content:"Our perspective combines practical experience, thoughtful strategy, and a clear focus on sustainable results.",sortOrder:1}] } } });
    }
    for (const [index,name] of [category,"Strategy","Growth"].entries()) {
      const tag = await prisma.blogTag.upsert({where:{name},update:{},create:{name,slug:slugify(name)}});
      await prisma.blogTagAssignment.upsert({where:{blogId_tagId:{blogId:blog.id,tagId:tag.id}},update:{sortOrder:index},create:{blogId:blog.id,tagId:tag.id,sortOrder:index}});
    }
  }
  console.log(`Seeded ${posts.length} blog posts`);
}
main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
