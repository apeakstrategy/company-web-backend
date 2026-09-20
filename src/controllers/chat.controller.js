const { generateReply } = require("../services/chat.service");

exports.send = async (req, res) => {
  const reply = await generateReply(req.validated.body);
  res.json({ success: true, reply, timestamp: new Date().toISOString() });
};
