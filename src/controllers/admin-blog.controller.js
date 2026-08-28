const service = require("../services/mysql-blog.service");
exports.list = async (req,res) => res.json({success:true,...await service.listAdmin(req.validated.query)});
exports.stats = async (_req,res) => res.json({success:true,data:await service.stats()});
exports.get = async (req,res) => res.json({success:true,data:await service.getAdmin(req.validated.params.id)});
exports.create = async (req,res) => res.status(201).json({success:true,data:await service.create(req.validated.body)});
exports.update = async (req,res) => res.json({success:true,data:await service.update(req.validated.params.id,req.validated.body)});
exports.remove = async (req,res) => { await service.remove(req.validated.params.id); res.status(204).send(); };
