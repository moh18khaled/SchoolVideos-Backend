const sendError = require("../utils/sendError");

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(sendError(403, "notAdmin"));
    next();
  };
};
module.exports = authorizeRoles;
