const { Prisma } = require("../generated/prisma-client");
const multer = require("multer");

const notFound = (req, _res, next) => {
  const AppError = require("../utils/AppError");
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      message = "A record with that unique value already exists";
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "The requested record was not found";
    }
  }
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 10 MB or smaller" : err.message;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  const response = {
    success: false,
    error: { message },
  };

  if (err.details) response.error.details = err.details;
  if (process.env.NODE_ENV === "development" && statusCode >= 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };
