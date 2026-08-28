const service = require("../services/mysql-blog.service");
exports.list = async (req,res) => res.json({success:true,...await service.listPublic(req.validated.query)});
exports.get = async (req,res) => res.json({success:true,data:await service.getPublic(req.validated.params.slug)});
exports.related = async (req,res) => res.json({success:true,data:await service.related(req.validated.params.slug,req.validated.query.limit)});
exports.view = async (req,res) => { await service.incrementViews(req.validated.params.slug); res.status(204).send(); };
exports.categories = async (_req,res) => res.json({success:true,data:await service.categories()});
exports.tags = async (_req,res) => res.json({success:true,data:await service.tags()});
