const transporter = require("../config/mailer");

exports.sendMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;

  await transporter.sendMail({
    from: email,
    to: process.env.MAIL_USER,
    subject: `Contact: ${subject}`,
    html: `
      <h3>${name}</h3>
      <p>${message}</p>
      <small>${email}</small>
    `,
  });

  res.json({ message: "Message sent" });
};
