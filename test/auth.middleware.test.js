const test = require("node:test");
const assert = require("node:assert/strict");
const { loginSchema } = require("../src/validators/auth.validator");
const { requireCsrf } = require("../src/middlewares/auth.middleware");

test("normalizes an admin email and rejects weak credentials", () => {
  const valid = loginSchema.parse({ email: " Admin@Example.COM ", password: "a-secure-password" });
  assert.equal(valid.email, "admin@example.com");
  assert.equal(loginSchema.safeParse({ email: "bad", password: "short" }).success, false);
});

test("CSRF middleware accepts only the token bound to the session", () => {
  const accepted = { auth: { csrf: "expected" }, get: () => "expected" };
  let acceptedError;
  requireCsrf(accepted, {}, (error) => { acceptedError = error; });
  assert.equal(acceptedError, undefined);

  const rejected = { auth: { csrf: "expected" }, get: () => "different" };
  let rejectedError;
  requireCsrf(rejected, {}, (error) => { rejectedError = error; });
  assert.equal(rejectedError.statusCode, 403);
});
