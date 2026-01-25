const blogService = require("../services/blog.service");
const slugify = require("slugify");

exports.createBlog = async (req, res) => {
  const slug = slugify(req.body.title, { lower: true });

  await blogService.createBlog({
    ...req.body,
    slug,
    author: "APeakStrategy Team",
  });

  res.status(201).json({ message: "Blog created" });
};

exports.getBlogs = async (_, res) => {
  res.json(await blogService.getAllBlogs());
};

exports.getBlog = async (req, res) => {
  res.json(await blogService.getBlogBySlug(req.params.slug));
};

exports.updateBlog = async (req, res) => {
  await blogService.updateBlog(req.params.slug, req.body);
  res.json({ message: "Updated" });
};

exports.deleteBlog = async (req, res) => {
  await blogService.deleteBlog(req.params.slug);
  res.json({ message: "Deleted" });
};
