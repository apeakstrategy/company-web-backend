const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const controller = require("../controllers/newsletter.controller");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const { publicSubscribe, tokenBody, unsubscribeQuery } = require("../validators/newsletter.validator");

router.post("/subscribe", rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }), validate({ body: publicSubscribe }), asyncHandler(controller.subscribe));
router.post("/confirm", rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }), validate({ body: tokenBody }), asyncHandler(controller.confirm));
router.post("/unsubscribe", rateLimit({ windowMs: 60 * 60 * 1000, limit: 1000, standardHeaders: "draft-8", legacyHeaders: false }), (req, res, next) => {
  return (req.query.token ? validate({ query: unsubscribeQuery }) : validate({ body: tokenBody }))(req, res, next);
}, asyncHandler(controller.unsubscribe));

module.exports = router;
