const express = require("express");
const videoController = require("../controllers/videoController");
const verifyToken = require("../middlewares/verifyToken");
const authorizeRoles = require("../middlewares/authorizeRoles");
const asyncHandler = require("express-async-handler");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const optionalAuth = require("../middlewares/optionalAuth");

const router = express.Router();

// Upload a video (Admin only)
router.post("/", verifyToken,validateRequiredFields("video"), authorizeRoles("admin"), asyncHandler(videoController.addVideo));

// Get videos filtered by grade
router.get("/", asyncHandler(videoController.getVideosByGrade));

// Delete a video (Admin only)
router.delete("/:id", verifyToken, authorizeRoles("admin"), asyncHandler(videoController.deleteVideo));
router.patch("/:id", verifyToken, authorizeRoles("admin"), asyncHandler(videoController.updateVideo));

// Search videos
router.get("/search", asyncHandler(videoController.searchVideos));

// Get a single video by ID
router.get("/:id",optionalAuth, asyncHandler(videoController.getVideo));


// Toggle love for a video
router.patch("/:id/toggleLove", verifyToken, asyncHandler(videoController.toggleLike));

module.exports = router;
