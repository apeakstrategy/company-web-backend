const subscribeService = require("../services/subscribe.service");

exports.subscribe = async (req, res) => {
  await subscribeService.subscribe(req.body.email);
  res.json({ message: "Subscribed successfully" });
};

exports.getAll = async (_, res) => {
  res.json(await subscribeService.getSubscribers());
};

exports.unsubscribe = async (req, res) => {
  await subscribeService.unsubscribe(req.params.id);
  res.json({ message: "Unsubscribed" });
};
