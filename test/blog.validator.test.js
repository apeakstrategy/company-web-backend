const test = require("node:test");
const assert = require("node:assert/strict");
const { createBlogSchema, publicList } = require("../src/validators/blog.validator");
const base = { title:"Article",excerpt:"A useful article excerpt",category:"Strategy",coverImageUrl:"/assets/blog.jpg",authorName:"Team",readTimeMinutes:5,isFeatured:false,status:"DRAFT",sortOrder:0,tags:[],sections:[],galleryImages:[] };
test("accepts a structured blog with local or Cloudinary images",()=>{ assert.equal(createBlogSchema.safeParse({...base,sections:[{heading:"Topic",paragraphs:["Paragraph"],images:[{url:"https://res.cloudinary.com/demo/image/upload/a.jpg",altText:"Detail"}]}]}).success,true); });
test("rejects incomplete blog section content",()=>{ assert.equal(createBlogSchema.safeParse({...base,sections:[{heading:"",paragraphs:[""],images:[]}]}).success,false); });
test("coerces public blog pagination defaults",()=>{ const query=publicList.parse({page:"2"}); assert.equal(query.page,2); assert.equal(query.limit,9); assert.equal(query.sortBy,"publishedAt"); });
