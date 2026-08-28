const router = require("express").Router();
const multer = require("multer");
const controller = require("../controllers/upload.controller");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const AppError = require("../utils/AppError");
const { requireAdmin, requireCsrf } = require("../middlewares/auth.middleware");
const { deleteImageSchema } = require("../validators/upload.validator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(file.mimetype)) return callback(new AppError(400, "Only JPEG, PNG, WebP, and AVIF images are allowed"));
    callback(null, true);
  },
});

router.use(asyncHandler(requireAdmin), requireCsrf);
router.post("/", upload.single("image"), asyncHandler(controller.upload));
router.delete("/", validate({ body: deleteImageSchema }), asyncHandler(controller.remove));

module.exports = router;
