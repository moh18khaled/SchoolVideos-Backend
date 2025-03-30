const mongoose = require("mongoose");
const Video = require("../models/video");
const User = require("../models/user");
const sendError = require("../utils/sendError");
const validateUser = require("../utils/validateUser");
const cloudinaryDelete = require("../utils/cloudinaryDelete");
const validateVideo = require("../utils/validateVideo");

// Add new video
exports.addVideo = async (req, res, next) => {
  const user = await validateUser(req, next);
  console.log(user);
  const { title, videoUrl, videoPublicId, grade } = req.body;

  const video = videoUrl ? { url: videoUrl, public_id: videoPublicId } : null;

  // Create the post
  const newVideo = new Video({
    title,
    video,
    grade,
  });

  await newVideo.save();

  const filteredVideo = {
    url: newVideo.video.url, // Extract video URL
    title: newVideo.title, // Extract title
    lovedByCount: newVideo.lovedBy.length, // Count lovedBy array
    grade: newVideo.grade, // Keep grade array
  };

  return res.status(200).json({
    message: "video added successfully",
    data: filteredVideo,
  });
};

// Get videos by grades
exports.getVideosByGrade = async (req, res, next) => {
  // Fetch all videos, sorted by createdAt (descending)
  const { grade } = req.query;

  if (!grade) {
    return next(sendError(400, "gradeIsRequired"));
  }

  const gradeNumber = Number(grade); // Convert to number

  if (isNaN(gradeNumber) || gradeNumber < 1 || gradeNumber > 12) {
    return next(sendError(400, "gradeMustBeNum"));
  }

  // Find videos where the grade array contains the requested grade
  const videos = await Video.find({ grade: { $in: [gradeNumber] } })
    .sort({ createdAt: -1 })
    .lean(); // Convert Mongoose documents to plain objects

  if (videos.length === 0) {
    return res.status(200).json({
      message: "No videos found.",
      videos: [],
    });
  }

  const filteredVideos = videos.map(({ video, title, lovedBy, grade }) => ({
    url: video.url, // Extract video URL
    title, // Extract title
    lovedByCount: lovedBy.length, // Count lovedBy array
    grade, // Keep grade array
  }));

  return res.status(200).json({
    message: "videos retrieved successfully",
    data: filteredVideos,
  });
};

// Get any video be id
exports.getVideo = async (req, res, next) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(sendError(400, "invalidVideoId"));
  const video = await Video.findById(id).lean(); // Use lean() for better performance if read-only

  if (!video) return next(sendError(404, "video"));

  const filteredVideo = {
    url: video.video.url, // Extract video URL
    title: video.title, // Extract title
    lovedByCount: video.lovedBy.length, // Count lovedBy array
    grade: video.grade, // Keep grade array
  };

  let isLiked = false;

  if (userId) {
    const user = await User.findById(userId).select("lovedVideos");
    if (user) {
      isLiked = user.lovedVideos?.some((vid) => vid.toString() === id);
    }
  }

  return res.status(200).json({
    message: "Video retrieved successfully",
    data: { ...filteredVideo, isLiked },
  });
};

// Modify video
exports.updateVideo = async (req, res, next) => {
  await validateUser(req, next);
  const video = await validateVideo(req, next);

  const { title, videoUrl, videoPublicId, grade } = req.body; // Get updated post data

  // Update the post fields
  if (title) video.title = title;
  if (grade) video.grade = grade;
  if (videoUrl && videoPublicId) {
    const oldPublic_id = video.video.public_id;
    video.video.url = videoUrl;
    video.video.public_id = videoPublicId;
    await cloudinaryDelete(oldPublic_id);
  }
  // Save the updated post

  await video.save();

  const filteredVideo = {
    url: video.video.url, // Extract video URL
    title: video.title, // Extract title
    lovedByCount: video.lovedBy.length, // Count lovedBy array
    grade: video.grade, // Keep grade array
  };

  return res.status(200).json({
    message: "video updated successfully",
    data: filteredVideo,
  });
};

// Like/Unlike video
exports.toggleLike = async (req, res, next) => {
  const user = await validateUser(req, next);
  const video = await validateVideo(req, next);

  const session = await mongoose.startSession();
  session.startTransaction();

  const alreadyLiked = video.lovedBy.some(
    (id) => id.toString() === user.id.toString()
  );

  if (alreadyLiked) {
    // Unlike video
    video.lovedBy.pull(user.id);
    user.lovedVideos.pull(video._id);
  } else {
    // Like video
    video.lovedBy.push(user.id);
    user.lovedVideos.push(video._id);
  }

  // Save only if there is a change
  await Promise.all([video.save({ session }), user.save({ session })]);

  await session.commitTransaction();
  session.endSession();

  res.status(200).json({
    message: alreadyLiked
      ? "Video unliked successfully"
      : "Video liked successfully",
    likesCount: video.lovedBy.length,
    likedBy: video.lovedBy,
  });
};

//Delete video
exports.deleteVideo = async (req, res, next) => {
  // Start a MongoDB transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  const user = await validateUser(req, next);
  const video = await validateVideo(req, next);

  // Attempt to delete video & image from Cloudinary
  try {
    await cloudinaryDelete(video.video.public_id);
  } catch (cloudinaryError) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(500, "cloudinary"));
  }

  // Remove the post reference from the user's likedPosts and posts
  await User.updateMany(
    { lovedVideos: video._id },
    { $pull: { lovedVideos: video._id } },
    { session } // Added session
  );
  await user.save({ session });

  // Delete the post
  await video.deleteOne({ session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  res.status(200).json({
    message: "video deleted successfully",
  });
};

// Search for posts by title or content
exports.searchVideos = async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(sendError(400, "searchQuery"));
  }

  const videos = await Video.find({
    title: { $regex: query, $options: "i" }, // Case-insensitive title search
  });

  if (videos.length === 0) {
    return next(sendError(404, "No matching videos found"));
  }

  const filteredVideos = videos.map(({ video, title, lovedBy, grade }) => ({
    url: video.url, // Extract video URL
    title, // Extract title
    lovedByCount: lovedBy.length, // Count lovedBy array
    grade, // Keep grade array
  }));

  return res.status(200).json({
    message: "Videos retrieved successfully",
    results: videos.length,
    filteredVideos, // Fix: Return `videos` correctly
  });
};
