const sendError = require("../utils/sendError");

// Define the required fields for each entity.
const requiredFieldsByEntity = {
  user: ["username", "email", "password"],
  video: ["title", "videoUrl", "videoPublicId", "grade"],
};

/**
 * Middleware factory: Returns a middleware that validates required fields for a given entity.
 */
const validateRequiredFields = (entityType) => {
  return (req, res, next) => {

    const requiredFields = requiredFieldsByEntity[entityType];

    // Check for missing fields
    const missingFields = requiredFields.filter((field) => {
      const value = req.body[field];

      if (field === "grade") {
        return (
          !Array.isArray(value) || // Ensure it's an array
          value.length === 0 || // Ensure it's not empty
          !value.every((num) => Number.isInteger(num) && num >= 1 && num <= 12) // Ensure valid numbers
        );
      }

      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return next(sendError(400, "missingFields"));
    }

    next();
  };
};

module.exports = validateRequiredFields;
