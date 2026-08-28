const router = require("express").Router();
const controller = require("../controllers/work.controller");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const {
  createWorkSchema,
  updateWorkSchema,
  idParamsSchema,
  slugParamsSchema,
  listWorksSchema,
} = require("../validators/work.validator");

router.get("/categories", asyncHandler(controller.getCategories));
router.get("/", validate({ query: listWorksSchema }), asyncHandler(controller.getAll));
router.get(
  "/:slug",
  validate({ params: slugParamsSchema }),
  asyncHandler(controller.getOne)
);
module.exports = router;
