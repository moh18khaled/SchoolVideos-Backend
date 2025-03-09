const sendError = require("./sendError");
const Video = require("../models/video");
const mongoose = require("mongoose");

const validatePost = async (req, next) => {
  const { id } = req.params;

    // Check if the post ID is valid
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(sendError(400, "invalidVideoId"));

  const video = await Video.findById(id);
  if (!video) return next(sendError(404, "video"));

  return video;
};

module.exports = validatePost;
