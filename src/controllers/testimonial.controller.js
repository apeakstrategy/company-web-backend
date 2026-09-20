const service = require("../services/testimonial.service");

exports.publicList = async (_req, res) => {
  res.json({ success: true, data: await service.listPublic() });
};

exports.adminList = async (req, res) => {
  res.json({ success: true, ...await service.listAdmin(req.validated.query) });
};

exports.projectOptions = async (_req, res) => {
  res.json({ success: true, data: await service.projectOptions() });
};

exports.adminGet = async (req, res) => {
  res.json({ success: true, data: await service.getAdmin(req.validated.params.id) });
};

exports.create = async (req, res) => {
  res.status(201).json({ success: true, data: await service.create(req.validated.body) });
};

exports.update = async (req, res) => {
  res.json({ success: true, data: await service.update(req.validated.params.id, req.validated.body) });
};

exports.remove = async (req, res) => {
  await service.remove(req.validated.params.id);
  res.status(204).send();
};
