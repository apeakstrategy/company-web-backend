const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { publicSubscribe, campaignBody, sendCampaign, adminUpdateSubscriber } = require("../src/validators/newsletter.validator");
const service = require("../src/services/newsletter.service");
const worker = require("../src/services/newsletter-worker");
const mail = require("../src/services/newsletter-mail.service");
const transporter = require("../src/config/mailer");

test("newsletter input requires explicit consent and keeps campaigns bounded", () => {
  assert.equal(publicSubscribe.safeParse({ email: "person@example.com", consent: true, website: "" }).success, true);
  assert.equal(publicSubscribe.safeParse({ email: "person@example.com", consent: false }).success, false);
  assert.equal(publicSubscribe.safeParse({ email: "bad", consent: true }).success, false);
  assert.equal(campaignBody.safeParse({ subject: "News", body: "A useful update for our subscribers." }).success, true);
  assert.equal(campaignBody.safeParse({ subject: "Hi\nBcc: x", body: "A useful update for our subscribers." }).success, false);
  assert.equal(sendCampaign.safeParse({ mode: "SELECTED", subscriberIds: [] }).success, false);
  assert.equal(adminUpdateSubscriber.safeParse({ email: "new@example.com", status: "UNSUBSCRIBED" }).success, false);
});

test("public signup stores a pending address and sends a confirmation, never activates it directly", async () => {
  const originalAssert = mail.assertConfigured;
  const originalSend = mail.sendConfirmation;
  let created;
  let sentTo;
  mail.assertConfigured = () => {};
  mail.sendConfirmation = async (email, token) => { sentTo = email; assert.match(token, /^[a-f0-9]{64}$/); };
  const db = { newsletterSubscriber: {
    findUnique: async () => null,
    create: async ({ data }) => { created = data; return { id: 1, email: data.email }; },
    update: async () => ({}),
  } };
  try {
    await service.publicSubscribe({ email: "person@example.com", website: "" }, db);
    assert.equal(created.status, "PENDING");
    assert.equal(created.consentSource, "footer");
    assert.ok(created.consentAt instanceof Date);
    assert.match(created.confirmationTokenHash, /^[a-f0-9]{64}$/);
    assert.equal(sentTo, "person@example.com");
  } finally {
    mail.assertConfigured = originalAssert;
    mail.sendConfirmation = originalSend;
  }
});

test("confirmation activates only a valid pending subscriber and unsubscribe is idempotent", async () => {
  const token = "a".repeat(64);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const previousSecret = process.env.NEWSLETTER_TOKEN_SECRET;
  process.env.NEWSLETTER_TOKEN_SECRET = "a-test-secret-long-enough-for-this-test";
  let confirmed = false;
  let unsubscribed = false;
  const subscriber = { id: 4, email: "person@example.com", status: "PENDING", confirmationExpiresAt: new Date(Date.now() + 10000) };
  const db = { newsletterSubscriber: {
    findUnique: async ({ where }) => where.confirmationTokenHash === hash ? subscriber : subscriber,
    updateMany: async ({ data }) => { confirmed = data.status === "ACTIVE"; return { count: 1 }; },
    update: async ({ data }) => { unsubscribed = data.status === "UNSUBSCRIBED"; return {}; },
  } };
  try {
    await service.confirm(token, db);
    assert.equal(confirmed, true);
    subscriber.status = "ACTIVE";
    const linkToken = service.unsubscribeToken(subscriber);
    await service.unsubscribe(linkToken, db);
    assert.equal(unsubscribed, true);
    await assert.rejects(service.unsubscribe(`4.${"0".repeat(64)}`, db), (error) => error.statusCode === 400);
  } finally {
    if (previousSecret === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = previousSecret;
  }
});

test("campaign queue snapshots only active selected recipients", async () => {
  const originalAssert = mail.assertConfigured;
  mail.assertConfigured = () => {};
  let deliveries;
  const tx = {
    newsletterCampaign: { updateMany: async () => ({ count: 1 }) },
    newsletterSubscriber: { findMany: async () => [{ id: 2, email: "a@example.com" }, { id: 3, email: "b@example.com" }] },
    newsletterDelivery: { createMany: async ({ data }) => { deliveries = data; } },
  };
  try {
    const result = await service.queueCampaign(7, { mode: "SELECTED", subscriberIds: [2, 3] }, { $transaction: (callback) => callback(tx) });
    assert.equal(result.queued, 2);
    assert.deepEqual(deliveries.map((item) => item.email), ["a@example.com", "b@example.com"]);
    await assert.rejects(service.queueCampaign(7, { mode: "SELECTED", subscriberIds: [2, 3, 4] }, { $transaction: (callback) => callback(tx) }), (error) => error.statusCode === 400);
  } finally { mail.assertConfigured = originalAssert; }
});

test("worker skips a recipient who unsubscribed after the campaign was queued", async () => {
  let deliveryStatus;
  let campaignStatus;
  const db = {
    newsletterDelivery: {
      findFirst: async () => ({ id: 9 }),
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => ({ id: 9, campaignId: 2, email: "former@example.com", campaign: { subject: "Update", body: "Message" }, subscriber: { id: 3, email: "former@example.com", status: "UNSUBSCRIBED" } }),
      update: async ({ data }) => { deliveryStatus = data.status; },
      count: async () => 0,
    },
    newsletterCampaign: { updateMany: async ({ data }) => { campaignStatus = data.status; } },
  };
  await worker.processOne(db);
  assert.equal(deliveryStatus, "SKIPPED");
  assert.equal(campaignStatus, "COMPLETED");
});

test("deleting a subscriber removes their address from delivery history", async () => {
  let anonymized;
  let deleted;
  const tx = {
    newsletterDelivery: { updateMany: async ({ data }) => { anonymized = data.email; } },
    newsletterSubscriber: { delete: async () => { deleted = true; } },
  };
  const db = {
    newsletterSubscriber: { findUnique: async () => ({ id: 5, email: "private@example.com" }) },
    $transaction: (callback) => callback(tx),
  };
  await service.deleteSubscriber(5, db);
  assert.equal(anonymized, "deleted-5@example.invalid");
  assert.equal(deleted, true);
});

test("campaign email escapes content and includes visible and one-click unsubscribe links", async () => {
  const originalAssert = mail.assertConfigured;
  const originalSend = transporter.sendMail;
  let message;
  mail.assertConfigured = () => {};
  transporter.sendMail = async (input) => { message = input; return { accepted: [input.to], messageId: "test" }; };
  try {
    await mail.sendCampaign("reader@example.com", "Project news", "See https://example.com/news\n<script>alert(1)</script>", `5.${"a".repeat(64)}`);
    assert.match(message.html, /href="https:\/\/example\.com\/news"/);
    assert.match(message.html, /&lt;script&gt;/);
    assert.doesNotMatch(message.html, /<script>/);
    assert.match(message.text, /Unsubscribe: /);
    assert.match(message.headers["List-Unsubscribe"], /newsletter\/unsubscribe\?token=/);
    assert.equal(message.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  } finally {
    mail.assertConfigured = originalAssert;
    transporter.sendMail = originalSend;
  }
});

test("subscriber list and legacy public write routes are not exposed", async () => {
  const app = require("../src/app");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const admin = await fetch(`${base}/admin/newsletter/subscribers`);
    assert.equal(admin.status, 401);
    const legacy = await fetch(`${base}/subscribe`);
    assert.equal(legacy.status, 404);
    const malformed = await fetch(`${base}/newsletter/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "bad", consent: false }) });
    assert.equal(malformed.status, 400);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
