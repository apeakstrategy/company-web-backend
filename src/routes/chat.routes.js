const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const { sendChatMessage } = require("../validators/chat.validator");
const controller = require("../controllers/chat.controller");

router.post(
  "/",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: "You've sent several messages in a short period. Please try again shortly." },
    },
  }),
  validate({ body: sendChatMessage }),
  asyncHandler(controller.send)
);

// Chat errors never expose provider details or development stack traces.
router.use((error, _req, res, _next) => {
  const status = error.statusCode && error.statusCode < 500 ? error.statusCode : error.statusCode || 500;
  const message = status >= 500
    ? "Sorry, I'm having trouble responding right now. You can still contact our team directly."
    : status === 400 && error.message === "Validation failed"
      ? "Please check your message and try again."
      : error.message;
  const response = { success: false, error: { message } };
  if (status === 400 && error.details) response.error.details = error.details;
  res.status(status).json(response);
});

module.exports = router;
