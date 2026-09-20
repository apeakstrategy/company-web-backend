const service = require("../services/newsletter.service");

exports.subscribe = async (req, res) => {
  res.status(202).json({ success: true, data: await service.publicSubscribe(req.validated.body) });
};
exports.confirm = async (req, res) => {
  res.json({ success: true, data: await service.confirm(req.validated.body.token) });
};
exports.unsubscribe = async (req, res) => {
  const token = req.validated.query?.token || req.validated.body?.token;
  res.json({ success: true, data: await service.unsubscribe(token) });
};

exports.listSubscribers = async (req, res) => {
  res.json({ success: true, ...await service.listSubscribers(req.validated.query) });
};
exports.getSubscriber = async (req, res) => {
  res.json({ success: true, data: await service.getSubscriber(req.validated.params.id) });
};
exports.createSubscriber = async (req, res) => {
  res.status(201).json({ success: true, data: await service.createSubscriber(req.validated.body.email) });
};
exports.updateSubscriber = async (req, res) => {
  res.json({ success: true, data: await service.updateSubscriber(req.validated.params.id, req.validated.body) });
};
exports.resendConfirmation = async (req, res) => {
  res.json({ success: true, data: await service.resendConfirmation(req.validated.params.id) });
};
exports.deleteSubscriber = async (req, res) => {
  await service.deleteSubscriber(req.validated.params.id);
  res.status(204).send();
};

exports.listCampaigns = async (req, res) => {
  res.json({ success: true, ...await service.listCampaigns(req.validated.query) });
};
exports.getCampaign = async (req, res) => {
  res.json({ success: true, data: await service.getCampaign(req.validated.params.id) });
};
exports.listDeliveries = async (req, res) => {
  res.json({ success: true, ...await service.listDeliveries(req.validated.params.id, req.validated.query) });
};
exports.createCampaign = async (req, res) => {
  res.status(201).json({ success: true, data: await service.createCampaign(req.validated.body) });
};
exports.updateCampaign = async (req, res) => {
  res.json({ success: true, data: await service.updateCampaign(req.validated.params.id, req.validated.body) });
};
exports.deleteCampaign = async (req, res) => {
  await service.deleteCampaign(req.validated.params.id);
  res.status(204).send();
};
exports.sendCampaign = async (req, res) => {
  res.status(202).json({ success: true, data: await service.queueCampaign(req.validated.params.id, req.validated.body) });
};
