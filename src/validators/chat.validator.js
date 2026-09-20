const { z } = require("zod");

const chatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1200),
}).strict();

const sendChatMessage = z.object({
  message: z.string().trim().min(1).max(1200),
  history: z.array(chatMessage).max(10).default([]),
}).strict().superRefine((data, ctx) => {
  if (data.history.reduce((length, item) => length + item.content.length, 0) > 8000) {
    ctx.addIssue({ code: "custom", path: ["history"], message: "Conversation history is too long" });
  }
});

module.exports = { sendChatMessage };
