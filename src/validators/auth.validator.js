const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  password: z.string().min(8).max(128),
}).strict();

module.exports = { loginSchema };
