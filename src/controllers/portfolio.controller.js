const portfolioService = require("../services/portfolio.service");

exports.create = async (req, res) => {
  await portfolioService.createPortfolio(req.body);
  res.status(201).json({ message: "Portfolio item created" });
};

exports.getAll = async (_, res) => {
  res.json(await portfolioService.getAllPortfolio());
};

exports.getOne = async (req, res) => {
  res.json(await portfolioService.getPortfolioById(req.params.id));
};

exports.update = async (req, res) => {
  await portfolioService.updatePortfolio(req.params.id, req.body);
  res.json({ message: "Portfolio updated" });
};

exports.remove = async (req, res) => {
  await portfolioService.deletePortfolio(req.params.id);
  res.json({ message: "Portfolio deleted" });
};
