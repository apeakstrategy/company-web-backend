const router = require("express").Router();
const controller = require("../controllers/testimonial.controller");
const asyncHandler = require("../utils/asyncHandler");

router.get("/", asyncHandler(controller.publicList));

module.exports = router;
