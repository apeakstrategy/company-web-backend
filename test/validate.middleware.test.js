const test = require("node:test");
const assert = require("node:assert/strict");
const validate = require("../src/middlewares/validate");
const { listWorksSchema } = require("../src/validators/work.validator");

test("stores coerced query values and defaults outside Express req.query", () => {
  const rawQuery = { page: "1", limit: "6" };
  const req = {};
  Object.defineProperty(req, "query", {
    get: () => rawQuery,
    configurable: true,
  });

  let nextError;
  validate({ query: listWorksSchema })(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  assert.deepEqual(req.query, rawQuery);
  assert.equal(req.validated.query.page, 1);
  assert.equal(req.validated.query.limit, 6);
  assert.equal(req.validated.query.status, "PUBLISHED");
  assert.equal(req.validated.query.sortBy, "sortOrder");
  assert.equal(req.validated.query.sortOrder, "asc");
});
