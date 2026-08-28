const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const controller = require("../controllers/auth.controller");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const { requireAdmin, requireCsrf } = require("../middlewares/auth.middleware");
const { loginSchema } = require("../validators/auth.validator");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  message: { success: false, error: { message: "Too many login attempts. Try again later." } },
});

router.post("/login", loginLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
router.get("/me", asyncHandler(requireAdmin), asyncHandler(controller.me));
router.post("/logout", asyncHandler(requireAdmin), requireCsrf, asyncHandler(controller.logout));

module.exports = router;
