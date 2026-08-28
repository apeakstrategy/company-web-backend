const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const controller = require("../controllers/mysql-blog.controller");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { publicList, slugParams, relatedQuery } = require("../validators/blog.validator");

const viewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
router.get("/categories", asyncHandler(controller.categories));
router.get("/tags", asyncHandler(controller.tags));
router.get("/", validate({query:publicList}), asyncHandler(controller.list));
router.get("/:slug/related", validate({params:slugParams,query:relatedQuery}), asyncHandler(controller.related));
router.post("/:slug/view", viewLimiter, validate({params:slugParams}), asyncHandler(controller.view));
router.get("/:slug", validate({params:slugParams}), asyncHandler(controller.get));
module.exports = router;
