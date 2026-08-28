const workService = require("../services/work.service");

exports.create = async (req, res) => {
  const work = await workService.createWork(req.validated.body);
  res.status(201).json({ success: true, data: work });
};

exports.getAll = async (req, res) => {
  const result = await workService.listWorks(req.validated.query);
  res.json({ success: true, ...result });
};

exports.getOne = async (req, res) => {
  const work = await workService.getPublishedWorkBySlug(req.validated.params.slug);
  res.json({ success: true, data: work });
};

exports.update = async (req, res) => {
  const work = await workService.updateWork(
    req.validated.params.id,
    req.validated.body
  );
  res.json({ success: true, data: work });
};

exports.remove = async (req, res) => {
  await workService.deleteWork(req.validated.params.id);
  res.status(204).send();
};

exports.getCategories = async (_req, res) => {
  const categories = await workService.listCategories();
  res.json({ success: true, data: categories });
};
