require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const AppError = require("./utils/AppError");

const app = express();

if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedOrigins = configuredOrigins.length ? configuredOrigins : developmentOrigins;

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError(403, "Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use("/api/chat", (req, _res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return next(new AppError(415, "Please send a JSON request."));
  }
  next();
});
app.use("/api/chat", express.json({ limit: "16kb" }));
app.use("/api/chat", (error, _req, res, _next) => {
  res.status(error.type === "entity.too.large" ? 413 : error.statusCode || error.status || 400).json({
    success: false,
    error: { message: error.type === "entity.too.large" ? "Message is too long." : error.statusCode === 415 ? "Please send a JSON request." : "Please send a valid JSON request." },
  });
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX) || 300,
    skip: (req) => req.method === "POST" && req.originalUrl.split("?")[0] === "/api/newsletter/unsubscribe",
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/blogs", require("./routes/blog.routes"));
app.use("/api/portfolio", require("./routes/portfolio.routes"));
app.use("/api/works", require("./routes/work.routes"));
app.use("/api/auth/admin", require("./routes/auth.routes"));
app.use("/api/admin/works", require("./routes/admin-work.routes"));
app.use("/api/admin/blogs", require("./routes/admin-blog.routes"));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/admin/inquiries", require("./routes/admin-contact.routes"));
app.use("/api/admin/uploads", require("./routes/upload.routes"));
app.use("/api/testimonials", require("./routes/testimonial.routes"));
app.use("/api/admin/testimonials", require("./routes/admin-testimonial.routes"));
app.use("/api/newsletter", require("./routes/newsletter.routes"));
app.use("/api/admin/newsletter", require("./routes/admin-newsletter.routes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
