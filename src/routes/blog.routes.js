const router = require("express").Router();
const ctrl = require("../controllers/blog.controller");

router.post("/", ctrl.createBlog);
router.get("/", ctrl.getBlogs);
router.get("/:slug", ctrl.getBlog);
router.put("/:slug", ctrl.updateBlog);
router.delete("/:slug", ctrl.deleteBlog);

module.exports = router;
