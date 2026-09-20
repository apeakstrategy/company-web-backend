const transporter = require("../config/mailer");
const { escapeHtml } = require("../utils/emailTemplates");
const AppError = require("../utils/AppError");

const siteUrl = () => process.env.PUBLIC_SITE_URL || "http://localhost:3000";
const apiUrl = () => process.env.PUBLIC_API_URL || "http://localhost:5000/api";
const from = () => ({
  name: process.env.MAIL_FROM_NAME || "A Peak Strategy",
  address: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || process.env.MAIL_USER,
});

exports.assertConfigured = () => {
  if (!(process.env.SMTP_HOST || process.env.MAIL_HOST) ||
      !(process.env.SMTP_USER || process.env.MAIL_USER) ||
      !(process.env.SMTP_PASSWORD || process.env.MAIL_PASS) ||
      !from().address ||
      !(process.env.NEWSLETTER_TOKEN_SECRET || process.env.JWT_SECRET) ||
      (process.env.NODE_ENV === "production" && (!process.env.PUBLIC_SITE_URL || !process.env.PUBLIC_API_URL))) {
    throw new AppError(503, "Newsletter email is not configured");
  }
  if (process.env.NODE_ENV === "production") {
    try {
      if (new URL(siteUrl()).protocol !== "https:" || new URL(apiUrl()).protocol !== "https:") {
        throw new Error("HTTPS is required");
      }
    } catch {
      throw new AppError(503, "Newsletter public URLs must be valid HTTPS URLs");
    }
  }
};

const page = (heading, body) => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#2d1810;color:#fff;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:30px 16px"><div style="border:1px solid #76543f;border-radius:18px;background:#3a2117;padding:28px"><p style="color:#f39a3d;font-size:12px;letter-spacing:2px;text-transform:uppercase">A Peak Strategy</p><h1 style="font-size:27px;line-height:1.2">${escapeHtml(heading)}</h1>${body}</div><p style="color:#bba99d;font-size:12px;text-align:center">A Peak Strategy · 232/10A, Himbutana Lane, Mulleriyawa</p></div></body></html>`;

function linkify(message) {
  let html = "";
  let start = 0;
  for (const match of message.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    html += escapeHtml(message.slice(start, match.index));
    const url = match[0].replace(/[.,!?;:]+$/, "");
    const suffix = match[0].slice(url.length);
    try {
      const parsed = new URL(url);
      html += parsed.protocol === "http:" || parsed.protocol === "https:"
        ? `<a href="${escapeHtml(url)}" style="color:#f39a3d">${escapeHtml(url)}</a>${escapeHtml(suffix)}`
        : escapeHtml(match[0]);
    } catch { html += escapeHtml(match[0]); }
    start = match.index + match[0].length;
  }
  return html + escapeHtml(message.slice(start));
}

const accepted = async (recipient, message) => {
  const result = await transporter.sendMail(message);
  if (!result.accepted?.some((address) => address.toLowerCase() === recipient.toLowerCase())) {
    throw new Error("SMTP did not accept the recipient");
  }
  return result;
};

exports.sendConfirmation = async (email, token) => {
  exports.assertConfigured();
  const link = `${siteUrl().replace(/\/$/, "")}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  return accepted(email, {
    from: from(), to: email,
    subject: "Confirm your A Peak Strategy updates",
    text: `Please confirm that you want occasional updates from A Peak Strategy:\n${link}\n\nIf you did not request this, ignore this email. The link expires in 48 hours.`,
    html: page("Confirm your subscription", `<p style="line-height:1.7;color:#e0d4ca">Please confirm that you want occasional news and promotions from us.</p><p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#e67e22;color:#fff;text-decoration:none;border-radius:999px;padding:13px 22px">Confirm my email</a></p><p style="color:#bba99d;font-size:13px">If you did not request this, ignore this email. This link expires in 48 hours.</p>`),
  });
};

exports.sendCampaign = async (email, subject, body, unsubscribeToken) => {
  exports.assertConfigured();
  const unsubscribeUrl = `${siteUrl().replace(/\/$/, "")}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const oneClickUrl = `${apiUrl().replace(/\/$/, "")}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  return accepted(email, {
    from: from(), to: email,
    replyTo: process.env.MAIL_REPLY_ADDRESS || from().address,
    subject,
    text: `${body}\n\nA Peak Strategy\n232/10A, Himbutana Lane, Mulleriyawa\nUnsubscribe: ${unsubscribeUrl}`,
    html: page(subject, `<div style="line-height:1.7;white-space:pre-wrap;color:#e0d4ca">${linkify(body)}</div><hr style="border:0;border-top:1px solid #76543f;margin:28px 0"><p style="color:#bba99d;font-size:12px">You received this because you confirmed your subscription. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#f39a3d">Unsubscribe</a>.</p>`),
    headers: {
      "List-Unsubscribe": `<${oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
};
