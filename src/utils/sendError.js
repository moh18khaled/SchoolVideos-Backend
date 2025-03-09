const AppError = require("./AppError");

const errorMessages = {
  400: {
    default: "Bad request.",
    cannotMake:"Can't make this action",
    missingFields: "All fields are required.",
    invalidId: "Invalid ID format.",
    invalidUserId: "Invalid user ID.",
    invalidVideoId: "Invalid video ID.",
    imageRequired: "Image is required.",
    searchQuery:"Search query is required",
    noToken:"Token is required",
    invalidToken:"Invalid or expired token",
    alreadyVerified:"Email already verified",
    InvalidEmail: "Invalid email format",
    gradeIsRequired:"Grade is required",
    gradeMustBeNum:"Grade must be a number between 1 and 12",
  },
  401: {
    default: "Unauthorized. Please log in again.",
    token: "token expired. Please log in again.",
    CurrentPassword: "Password is incorrect.",
    Invalidcardinalities: "Invalid email or password. Please try again.",
  },
  403: {
    default: "Forbidden.",
    notAuthenticated:"Forbidden: You must be logged in to perform this action.",
    notAuthorized: "Forbidden: You are not authorized to update this post",
    verifyEmail:"Please verify your email",
    notAdmin:"Forbidden: You must be an admin to perform this action.",
  },
  404: {
    default: "Not found.",
    user: "User not found.",
    Photo: "Photo not found",
    video: "vidoe not found",
    matchingVideos:"No matching posts found",
  },
  409: {
    default: "Conflict.",
    userExists: "Email or username already in use",
    InvalidCredentials: "Invalid credentials or data",
  },
  500: {
    default: "Conflict.",
    hashingError:
      "An error occurred while securing your password. Please try again later.",
    compareError:
      "An error occurred while verifying your password. Please try again later.",
      cloudinary:"Failed to delete media from Cloudinary",
      emailSendFailed:"Email send failed",
  },

  default: "An error occurred.",
};

const sendError = (statusCode, context = "") => {
  const statusMessages = errorMessages[statusCode] || {};
  const message =
    statusMessages[context] || statusMessages.default || errorMessages.default;

  return new AppError(message, statusCode);
};

module.exports = sendError;
