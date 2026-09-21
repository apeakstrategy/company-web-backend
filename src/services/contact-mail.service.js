const transporter = require("../config/mailer");
const templates = require("../utils/emailTemplates");
const AppError = require("../utils/AppError");

const from = () => ({
  name: process.env.MAIL_FROM_NAME || "APeakStrategy",
  address: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || process.env.MAIL_USER,
});
const replyAddress = () => process.env.MAIL_REPLY_ADDRESS || from().address;

exports.assertConfigured = () => {
  if (!(process.env.SMTP_HOST || process.env.MAIL_HOST) ||
      !(process.env.SMTP_USER || process.env.MAIL_USER) ||
      !(process.env.SMTP_PASSWORD || process.env.MAIL_PASS) ||
      !from().address) {
    throw new AppError(503, "Contact email is temporarily unavailable. Please email info@apeakstrategy.com directly.");
  }
};

async function sendTo(recipient, message) {
  const result = await transporter.sendMail(message);
  if (!result.accepted?.some((address) => address.toLowerCase() === recipient.toLowerCase())) {
    throw new Error("SMTP did not accept the recipient");
  }
  return result;
}

exports.sendNotification = (inquiry) => {
  exports.assertConfigured();
  const recipient = process.env.CONTACT_NOTIFICATION_TO || "info@apeakstrategy.com";
  const message = templates.notification(inquiry, `${process.env.ADMIN_APP_URL || "http://localhost:5173"}/messages/${inquiry.id}`);
  return sendTo(recipient, {
    from: from(),
    to: recipient,
    replyTo: inquiry.email,
    ...message,
  });
};

exports.sendConfirmation = (inquiry) => {
  exports.assertConfigured();
  return sendTo(inquiry.email, {
    from: from(),
    to: inquiry.email,
    replyTo: replyAddress(),
    ...templates.confirmation(inquiry),
  });
};

exports.sendReply = (inquiry, subject, message) => {
  exports.assertConfigured();
  return transporter.sendMail({
    from: from(),
    to: inquiry.email,
    replyTo: replyAddress(),
    ...templates.reply(inquiry, subject, message),
  });
};
