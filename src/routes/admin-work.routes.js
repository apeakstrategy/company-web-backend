const router = require("express").Router();
const controller = require("../controllers/admin-work.controller");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { requireAdmin, requireCsrf } = require("../middlewares/auth.middleware");
const {
  createWorkSchema, updateWorkSchema, idParamsSchema, adminListWorksSchema,
} = require("../validators/work.validator");

router.use(asyncHandler(requireAdmin));
router.get("/stats", asyncHandler(controller.getStats));
router.get("/", validate({ query: adminListWorksSchema }), asyncHandler(controller.getAll));
router.get("/:id", validate({ params: idParamsSchema }), asyncHandler(controller.getOne));
router.post("/", requireCsrf, validate({ body: createWorkSchema }), asyncHandler(controller.create));
router.put("/:id", requireCsrf, validate({ params: idParamsSchema, body: createWorkSchema }), asyncHandler(controller.update));
router.patch("/:id", requireCsrf, validate({ params: idParamsSchema, body: updateWorkSchema }), asyncHandler(controller.update));
router.delete("/:id", requireCsrf, validate({ params: idParamsSchema }), asyncHandler(controller.remove));

module.exports = router;
