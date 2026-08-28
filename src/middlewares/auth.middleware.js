const authService = require("../services/auth.service");
const AppError = require("../utils/AppError");

const cookieName = () => process.env.NODE_ENV === "production" ? "__Host-apeak_admin" : "apeak_admin";

exports.requireAdmin = async (req, _res, next) => {
  try {
    const token = req.cookies?.[cookieName()];
    if (!token) throw new AppError(401, "Authentication required");
    const payload = authService.verifyToken(token);
    const admin = await authService.getAdminById(Number(payload.sub));
    if (!admin || !admin.isActive) throw new AppError(401, "Authentication required");
    req.admin = admin;
    req.auth = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, "Authentication required"));
  }
};

exports.requireCsrf = (req, _res, next) => {
  const csrfToken = req.get("x-csrf-token");
  if (!csrfToken || csrfToken !== req.auth?.csrf) return next(new AppError(403, "Invalid CSRF token"));
  next();
};

exports.adminCookieName = cookieName;
