const router=require("express").Router();
const {rateLimit}=require("express-rate-limit");
const controller=require("../controllers/contact.controller");
const validate=require("../middlewares/validate");
const asyncHandler=require("../utils/asyncHandler");
const {submitContact}=require("../validators/contact.validator");
router.post("/",rateLimit({windowMs:3600000,limit:5,standardHeaders:"draft-8",legacyHeaders:false}),validate({body:submitContact}),asyncHandler(controller.submit));
module.exports=router;
