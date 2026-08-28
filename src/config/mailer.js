const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  pool: true,
  host: process.env.SMTP_HOST || process.env.MAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 587,
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: {
    user: process.env.SMTP_USER || process.env.MAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.MAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
});

module.exports = transporter;
