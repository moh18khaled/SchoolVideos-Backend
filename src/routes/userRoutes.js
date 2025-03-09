const express = require("express");
const asyncHandler = require("express-async-handler");
const userController = require("../controllers/userController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");
const optionalAuth = require("../middlewares/optionalAuth");

const router = express.Router();

router.post(
  "/signup",
  validateRequiredFields("user"),
  asyncHandler(userController.signup)
);
router.post(
  "/login",
  optionalAuth, // If the user is already logged in add add his id
  asyncHandler(userController.login)
);

router.post("/logout", verifyToken, asyncHandler(userController.logout));

router.get("/verify-email", asyncHandler(userController.verifyEmail));

router.post(
  "/reset-password",
  asyncHandler(userController.requestPasswordReset)
);
router.post("/reset-password/confirm", asyncHandler(userController.confirmPasswordReset));
 
router.post(
  "/contact",
  asyncHandler(userController.contactSupport)
);

router
  .route("/account")
  .get(verifyToken, asyncHandler(userController.getUserAccount))
  .patch(
    verifyToken,
    asyncHandler(userController.updateAccount)
  )
  .delete(verifyToken, asyncHandler(userController.deleteAccount));

router.patch(
  "/account/password",
  verifyToken,
  asyncHandler(userController.changePassword)
);

router.get("/account/videos/loved", verifyToken, asyncHandler(userController.getLovedVideos));

module.exports = router;
