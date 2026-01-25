const testimonialService = require("../services/testimonial.service");

exports.create = async (req, res) => {
  await testimonialService.createTestimonial(req.body);
  res.status(201).json({ message: "Testimonial created" });
};

exports.getAll = async (_, res) => {
  res.json(await testimonialService.getAllTestimonials());
};

exports.getOne = async (req, res) => {
  res.json(await testimonialService.getTestimonialById(req.params.id));
};

exports.update = async (req, res) => {
  await testimonialService.updateTestimonial(req.params.id, req.body);
  res.json({ message: "Testimonial updated" });
};

exports.remove = async (req, res) => {
  await testimonialService.deleteTestimonial(req.params.id);
  res.json({ message: "Testimonial deleted" });
};
