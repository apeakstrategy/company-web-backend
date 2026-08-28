const authService = require("../services/auth.service");
const { adminCookieName } = require("../middlewares/auth.middleware");

const cookieOptions = () => ({
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  path: "/", maxAge: 8 * 60 * 60 * 1000,
});

exports.login = async (req, res) => {
  const { email, password } = req.validated.body;
  const session = await authService.authenticate(email, password);
  res.cookie(adminCookieName(), session.token, cookieOptions());
  res.json({ success: true, data: { admin: session.admin, csrfToken: session.csrfToken } });
};

exports.me = async (req, res) => res.json({
  success: true, data: { admin: req.admin, csrfToken: req.auth.csrf },
});

exports.logout = async (_req, res) => {
  res.clearCookie(adminCookieName(), cookieOptions());
  res.status(204).send();
};
