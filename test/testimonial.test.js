const test = require("node:test");
const assert = require("node:assert/strict");
const { testimonialBody, testimonialList } = require("../src/validators/testimonial.validator");
const service = require("../src/services/testimonial.service");

const draft = {
  clientName: "Alex Customer",
  attribution: "Founder, Example Co.",
  quote: "The team listened closely and delivered a clear, thoughtful website.",
  workId: null,
  status: "DRAFT",
  sortOrder: 0,
  consentConfirmed: false,
};

test("testimonial validation requires permission to publish and bounds all fields", () => {
  assert.equal(testimonialBody.safeParse(draft).success, true);
  assert.equal(testimonialBody.safeParse({ ...draft, status: "PUBLISHED" }).success, false);
  assert.equal(testimonialBody.safeParse({ ...draft, status: "PUBLISHED", consentConfirmed: true }).success, true);
  for (const body of [
    { ...draft, clientName: " " },
    { ...draft, quote: "Too short" },
    { ...draft, workId: -1 },
    { ...draft, sortOrder: -1 },
    { ...draft, rating: 5 },
  ]) assert.equal(testimonialBody.safeParse(body).success, false);
  assert.equal(testimonialList.parse({}).page, 1);
});

test("public testimonials expose only approved fields and link only published works", async () => {
  let query;
  const db = { testimonial: { findMany: async (options) => {
    query = options;
    return [
      { id: 1, clientName: "Alex", attribution: "Founder", quote: draft.quote, work: { title: "Project", slug: "project", status: "PUBLISHED" } },
      { id: 2, clientName: "Sam", attribution: "Designer", quote: draft.quote, work: { title: "Hidden", slug: "hidden", status: "DRAFT" } },
    ];
  } } };
  const result = await service.listPublic(db);
  assert.deepEqual(query.where, { status: "PUBLISHED", consentConfirmed: true });
  assert.equal(result[0].project.slug, "project");
  assert.equal(result[1].project, null);
  assert.equal("consentConfirmed" in result[0], false);
  assert.equal("workId" in result[0], false);
});

test("linked projects must be published before creating a testimonial", async () => {
  const db = {
    work: { findUnique: async () => ({ id: 3, status: "DRAFT" }) },
    testimonial: { create: async () => { throw new Error("must not create"); } },
  };
  await assert.rejects(service.create({ ...draft, workId: 3 }, db), error => error.statusCode === 400);
});

test("public testimonial writes are unavailable and admin writes require login", async () => {
  const app = require("../src/app");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const publicWrite = await fetch(`${base}/testimonials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    assert.equal(publicWrite.status, 404);
    const adminWrite = await fetch(`${base}/admin/testimonials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    assert.equal(adminWrite.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
