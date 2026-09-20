const test = require("node:test");
const assert = require("node:assert/strict");
const { submitContact } = require("../src/validators/contact.validator");
const contactService = require("../src/services/contact-inquiry.service");

const input = () => ({
  name: "Alex Customer",
  email: "alex@example.com",
  subject: "Website project",
  message: "I would like to discuss a new website project.",
  website: "",
  formStartedAt: new Date(Date.now() - 5000).toISOString(),
  turnstileToken: "",
});
const request = { ip: "127.0.0.1", get: () => "contact-test" };

function createDb() {
  const records = [];
  const db = { contactInquiry: {
    findFirst: async () => records[0] || null,
    create: async ({ data }) => {
      const record = { id: 1, createdAt: new Date(), notificationStatus: "PENDING", confirmationStatus: "PENDING", ...data };
      records.push(record);
      return record;
    },
    update: async ({ data }) => Object.assign(records[0], data),
  } };
  return { db, records };
}

test("contact validation rejects empty, oversized, and header-injection content", () => {
  assert.equal(submitContact.safeParse(input()).success, true);
  for (const body of [
    { ...input(), name: " " },
    { ...input(), subject: "Hello\nBcc: victim@example.com" },
    { ...input(), email: "invalid" },
    { ...input(), message: "too short" },
    { ...input(), message: "x".repeat(10001) },
    { ...input(), website: "spam" },
    { ...input(), unexpected: true },
  ]) assert.equal(submitContact.safeParse(body).success, false);
});

test("Turnstile is optional without a secret and required when configured", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousHostnames = process.env.TURNSTILE_HOSTNAMES;
  const previousTestMode = process.env.TURNSTILE_TEST_MODE;
  const previousEnvironment = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    process.env.TURNSTILE_TEST_MODE = "true";
    delete process.env.TURNSTILE_SECRET_KEY;
    await assert.doesNotReject(contactService.verifyTurnstile("", "127.0.0.1"));
    process.env.TURNSTILE_SECRET_KEY = "configured-secret";
    await assert.rejects(contactService.verifyTurnstile("", "127.0.0.1"), error => error.statusCode === 400);
    await assert.rejects(contactService.verifyTurnstile("valid-looking-token", "127.0.0.1"), error => error.statusCode === 503);
  } finally {
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
    if (previousHostnames === undefined) delete process.env.TURNSTILE_HOSTNAMES;
    else process.env.TURNSTILE_HOSTNAMES = previousHostnames;
    if (previousTestMode === undefined) delete process.env.TURNSTILE_TEST_MODE;
    else process.env.TURNSTILE_TEST_MODE = previousTestMode;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test("Turnstile requires the contact action and an allowed frontend hostname", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousHostnames = process.env.TURNSTILE_HOSTNAMES;
  const previousTestMode = process.env.TURNSTILE_TEST_MODE;
  const previousEnvironment = process.env.NODE_ENV;
  const previousFetch = global.fetch;
  process.env.NODE_ENV = "production";
  delete process.env.TURNSTILE_TEST_MODE;
  process.env.TURNSTILE_SECRET_KEY = "configured-secret";
  process.env.TURNSTILE_HOSTNAMES = "localhost, www.apeakstrategy.com";
  try {
    let payload;
    global.fetch = async (_url, options) => {
      payload = options.body;
      return { ok: true, json: async () => ({ success: true, action: "contact", hostname: "localhost" }) };
    };
    await assert.doesNotReject(contactService.verifyTurnstile("fresh-token", "127.0.0.1"));
    assert.equal(payload.get("secret"), "configured-secret");
    assert.equal(payload.get("response"), "fresh-token");
    assert.equal(payload.get("remoteip"), "127.0.0.1");

    global.fetch = async () => ({ ok: true, json: async () => ({ success: true, action: "login", hostname: "localhost" }) });
    await assert.rejects(contactService.verifyTurnstile("wrong-action", "127.0.0.1"), error => error.statusCode === 400);
    global.fetch = async () => ({ ok: true, json: async () => ({ success: true, action: "contact", hostname: "attacker.example" }) });
    await assert.rejects(contactService.verifyTurnstile("wrong-host", "127.0.0.1"), error => error.statusCode === 400);
  } finally {
    global.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
    if (previousHostnames === undefined) delete process.env.TURNSTILE_HOSTNAMES;
    else process.env.TURNSTILE_HOSTNAMES = previousHostnames;
    if (previousTestMode === undefined) delete process.env.TURNSTILE_TEST_MODE;
    else process.env.TURNSTILE_TEST_MODE = previousTestMode;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test("Turnstile test mode is limited to development and accepts Cloudflare's test response", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousTestMode = process.env.TURNSTILE_TEST_MODE;
  const previousEnvironment = process.env.NODE_ENV;
  const previousFetch = global.fetch;
  process.env.NODE_ENV = "development";
  process.env.TURNSTILE_TEST_MODE = "true";
  delete process.env.TURNSTILE_SECRET_KEY;
  let submittedSecret;
  global.fetch = async (_url, options) => {
    submittedSecret = options.body.get("secret");
    return { ok: true, json: async () => ({ success: true, action: null, hostname: "example.com" }) };
  };
  try {
    await assert.doesNotReject(contactService.verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "127.0.0.1"));
    assert.equal(submittedSecret, "1x0000000000000000000000000000000AA");
  } finally {
    global.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
    if (previousTestMode === undefined) delete process.env.TURNSTILE_TEST_MODE;
    else process.env.TURNSTILE_TEST_MODE = previousTestMode;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test("a failed company email never reports success and can be retried without another record", async () => {
  const { db, records } = createDb();
  let notifications = 0;
  let confirmations = 0;
  const mailer = {
    assertConfigured: () => {},
    sendNotification: async () => { notifications++; if (notifications === 1) throw new Error("SMTP unavailable"); },
    sendConfirmation: async () => { confirmations++; },
  };
  const deps = { db, mailer, verify: async () => {} };
  await assert.rejects(contactService.submit(input(), request, deps), error => error.statusCode === 502);
  assert.equal(records[0].notificationStatus, "FAILED");
  assert.equal(confirmations, 0);
  const result = await contactService.submit(input(), request, deps);
  assert.equal(result.confirmationSent, true);
  assert.equal(result.reference, records[0].reference);
  assert.equal(records.length, 1);
  assert.equal(records[0].notificationStatus, "SENT");
  assert.equal(records[0].confirmationStatus, "SENT");
  await contactService.submit(input(), request, deps);
  assert.equal(notifications, 2);
  assert.equal(confirmations, 1);
});

test("a failed automatic reply is reported separately and retried safely", async () => {
  const { db, records } = createDb();
  let notifications = 0;
  let confirmations = 0;
  const mailer = {
    assertConfigured: () => {},
    sendNotification: async () => { notifications++; },
    sendConfirmation: async () => { confirmations++; if (confirmations === 1) throw new Error("Recipient unavailable"); },
  };
  const deps = { db, mailer, verify: async () => {} };
  const first = await contactService.submit(input(), request, deps);
  assert.equal(first.confirmationSent, false);
  assert.equal(records[0].confirmationStatus, "FAILED");
  const second = await contactService.submit(input(), request, deps);
  assert.equal(second.confirmationSent, true);
  assert.equal(notifications, 1);
  assert.equal(confirmations, 2);
});
