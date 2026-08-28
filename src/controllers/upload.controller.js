const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/AppError");

exports.upload = async (req, res) => {
  if (!req.file) throw new AppError(400, "An image file is required");

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: "apeak-strategy/works",
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    }, (error, uploadResult) => error ? reject(error) : resolve(uploadResult));
    stream.end(req.file.buffer);
  });

  res.status(201).json({ success: true, data: {
    url: result.secure_url, publicId: result.public_id,
    width: result.width, height: result.height,
  } });
};

exports.remove = async (req, res) => {
  const result = await cloudinary.uploader.destroy(req.validated.body.publicId, {
    resource_type: "image", invalidate: true,
  });
  if (!['ok', 'not found'].includes(result.result)) throw new AppError(502, "Cloudinary could not delete the image");
  res.status(204).send();
};
