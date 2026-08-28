const workService = require("../services/work.service");

exports.getAll = async (req, res) => {
  const result = await workService.listAdminWorks(req.validated.query);
  res.json({ success: true, ...result });
};
exports.getOne = async (req, res) => {
  const work = await workService.getAdminWorkById(req.validated.params.id);
  res.json({ success: true, data: work });
};
exports.getStats = async (_req, res) => {
  const stats = await workService.getAdminWorkStats();
  res.json({ success: true, data: stats });
};
exports.create = async (req, res) => {
  const work = await workService.createWork(req.validated.body);
  res.status(201).json({ success: true, data: work });
};
exports.update = async (req, res) => {
  const work = await workService.updateWork(req.validated.params.id, req.validated.body);
  res.json({ success: true, data: work });
};
exports.remove = async (req, res) => {
  await workService.deleteWork(req.validated.params.id);
  res.status(204).send();
};
