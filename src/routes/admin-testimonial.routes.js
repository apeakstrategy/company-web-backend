const router = require("express").Router();
const controller = require("../controllers/testimonial.controller");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { requireAdmin, requireCsrf } = require("../middlewares/auth.middleware");
const { testimonialBody, testimonialList, idParams } = require("../validators/testimonial.validator");

router.use(asyncHandler(requireAdmin));
router.get("/project-options", asyncHandler(controller.projectOptions));
router.get("/", validate({ query: testimonialList }), asyncHandler(controller.adminList));
router.get("/:id", validate({ params: idParams }), asyncHandler(controller.adminGet));
router.post("/", requireCsrf, validate({ body: testimonialBody }), asyncHandler(controller.create));
router.put("/:id", requireCsrf, validate({ params: idParams, body: testimonialBody }), asyncHandler(controller.update));
router.delete("/:id", requireCsrf, validate({ params: idParams }), asyncHandler(controller.remove));

module.exports = router;
