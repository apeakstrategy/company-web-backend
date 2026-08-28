const { z } = require("zod");

const deleteImageSchema = z.object({
  publicId: z.string().trim().min(1).max(255),
}).strict();

module.exports = { deleteImageSchema };
