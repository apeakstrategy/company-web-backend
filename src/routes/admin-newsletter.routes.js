const router = require("express").Router();
const controller = require("../controllers/newsletter.controller");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const { requireAdmin, requireCsrf } = require("../middlewares/auth.middleware");
const { idParams, listQuery, deliveryQuery, adminCreateSubscriber, adminUpdateSubscriber, campaignBody, sendCampaign } = require("../validators/newsletter.validator");

router.use(asyncHandler(requireAdmin));
router.get("/subscribers", validate({ query: listQuery }), asyncHandler(controller.listSubscribers));
router.get("/subscribers/:id", validate({ params: idParams }), asyncHandler(controller.getSubscriber));
router.post("/subscribers", requireCsrf, validate({ body: adminCreateSubscriber }), asyncHandler(controller.createSubscriber));
router.patch("/subscribers/:id", requireCsrf, validate({ params: idParams, body: adminUpdateSubscriber }), asyncHandler(controller.updateSubscriber));
router.post("/subscribers/:id/resend-confirmation", requireCsrf, validate({ params: idParams }), asyncHandler(controller.resendConfirmation));
router.delete("/subscribers/:id", requireCsrf, validate({ params: idParams }), asyncHandler(controller.deleteSubscriber));

router.get("/campaigns", validate({ query: listQuery }), asyncHandler(controller.listCampaigns));
router.get("/campaigns/:id", validate({ params: idParams }), asyncHandler(controller.getCampaign));
router.get("/campaigns/:id/deliveries", validate({ params: idParams, query: deliveryQuery }), asyncHandler(controller.listDeliveries));
router.post("/campaigns", requireCsrf, validate({ body: campaignBody }), asyncHandler(controller.createCampaign));
router.put("/campaigns/:id", requireCsrf, validate({ params: idParams, body: campaignBody }), asyncHandler(controller.updateCampaign));
router.delete("/campaigns/:id", requireCsrf, validate({ params: idParams }), asyncHandler(controller.deleteCampaign));
router.post("/campaigns/:id/send", requireCsrf, validate({ params: idParams, body: sendCampaign }), asyncHandler(controller.sendCampaign));

module.exports = router;
