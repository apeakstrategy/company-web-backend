const AppError = require("../utils/AppError");

module.exports = (schemas) => (req, _res, next) => {
  req.validated = req.validated || {};

  for (const location of ["params", "query", "body"]) {
    if (!schemas[location]) continue;

    const result = schemas[location].safeParse(req[location]);
    if (!result.success) {
      return next(
        new AppError(400, "Validation failed", result.error.flatten())
      );
    }
    // Express 5 exposes req.query as a getter, so assigning parsed values back
    // to req.query is unreliable. Keep all normalized input in one explicit
    // request property for controllers to consume.
    req.validated[location] = result.data;
  }

  next();
};
