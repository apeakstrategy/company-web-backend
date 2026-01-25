const router = require("express").Router();
const ctrl = require("../controllers/subscribe.controller");

router.post("/", ctrl.subscribe);
router.get("/", ctrl.getAll);
router.delete("/:id", ctrl.unsubscribe);

module.exports = router;
