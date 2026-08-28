const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const safeAdminSelect = {
  id: true, name: true, email: true, role: true, isActive: true,
  lastLoginAt: true, createdAt: true,
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return secret;
}

exports.authenticate = async (email, password) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  const fallbackHash = "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const validPassword = await bcrypt.compare(password, admin?.passwordHash || fallbackHash);
  if (!admin || !validPassword || !admin.isActive) throw new AppError(401, "Invalid email or password");

  const updatedAdmin = await prisma.admin.update({
    where: { id: admin.id }, data: { lastLoginAt: new Date() }, select: safeAdminSelect,
  });
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const token = jwt.sign(
    { sub: String(admin.id), role: admin.role, csrf: csrfToken }, getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h", issuer: "apeak-api", audience: "apeak-admin" }
  );
  return { admin: updatedAdmin, token, csrfToken };
};

exports.verifyToken = (token) => jwt.verify(token, getJwtSecret(), {
  issuer: "apeak-api", audience: "apeak-admin",
});

exports.getAdminById = (id) => prisma.admin.findUnique({ where: { id }, select: safeAdminSelect });
