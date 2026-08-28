const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createWorkSchema,
  updateWorkSchema,
  listWorksSchema,
} = require("../src/validators/work.validator");

test("accepts the minimum valid work and supplies nested defaults", () => {
  const result = createWorkSchema.parse({
    title: "Project",
    category: "Web Development",
    shortDescription: "A concise project summary",
    coverImageUrl: "https://res.cloudinary.com/demo/image/upload/project.jpg",
  });

  assert.deepEqual(result.sections, []);
  assert.deepEqual(result.galleryImages, []);
  assert.deepEqual(result.services, []);
  assert.deepEqual(result.technologies, []);
});

test("accepts safe frontend asset paths for seeded project images", () => {
  const result = createWorkSchema.safeParse({
    title: "Seeded project",
    category: "Social Media",
    shortDescription: "A seeded portfolio project",
    coverImageUrl: "/assets/work6.jpg",
    galleryImages: [{
      url: "/assets/finalPngs/socialMediaMain.png",
      altText: "Social media project",
    }],
  });

  assert.equal(result.success, true);
});

test("rejects unsafe relative image paths", () => {
  const result = createWorkSchema.safeParse({
    title: "Unsafe project",
    category: "Web",
    shortDescription: "An invalid image path",
    coverImageUrl: "/private/secrets.txt",
  });

  assert.equal(result.success, false);
});

test("rejects unknown work properties and invalid image URLs", () => {
  const result = createWorkSchema.safeParse({
    title: "Project",
    category: "Web Development",
    shortDescription: "A concise project summary",
    coverImageUrl: "not-a-url",
    unexpected: true,
  });

  assert.equal(result.success, false);
});

test("requires at least one property for a patch", () => {
  assert.equal(updateWorkSchema.safeParse({}).success, false);
  assert.equal(updateWorkSchema.safeParse({ status: "PUBLISHED" }).success, true);
});

test("coerces and bounds pagination query values", () => {
  const query = listWorksSchema.parse({ page: "2", limit: "20", featured: "true" });
  assert.equal(query.page, 2);
  assert.equal(query.limit, 20);
  assert.equal(query.featured, true);
  assert.equal(query.status, "PUBLISHED");
  assert.equal(listWorksSchema.safeParse({ limit: "101" }).success, false);
});
