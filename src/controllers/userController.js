const User = require("../models/user");
const Video = require("../models/video");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");
const sendVerificationLink = require("../utils/sendVerificationLink");
const generateAndSetTokens = require("../utils/generateAndSetTokens");
const clearCookies = require("../utils/clearCookies");
const singleDeviceLogout = require("../utils/singleDeviceLogout");
const cloudinaryDelete = require("../utils/cloudinaryDelete");
const validateUser = require("../utils/validateUser");
const generateJWT = require("../utils/generateJWT");
const verifyJWT = require("../utils/verifyJWT");
const validator = require("validator");
const sendEmail = require("../utils/sendEmail");

// User signup
exports.signup = async (req, res, next) => {
  const { email, password, username } = req.body;

  const oldUser = await User.findOne({ email: email.toLowerCase() }).lean();

  if (oldUser) return next(sendError(409, "userExists"));

  const newUser = new User({
    username,
    email,
    password, // Hashed automatically by the pre-save hook
  });

  await newUser.save();

  await sendVerificationLink(email, newUser.id);

  return res.status(201).json({
    message: "User registered! Please verify your email.",
    data: {
      username,
      email,
    },
  });
};

// Verify user's email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query; // Get the token from the query parameter

    if (!token) return next(sendError(400, "noToken"));

    // Decode the JWT token and verify it
    const decoded = verifyJWT(token);

    const user = await User.findById(decoded.id); // Find the user by ID

    if (!user) return next(sendError(400, "invalidToken"));

    if (user.isVerified) return next(sendError(400, "alreadyVerified"));

    // Mark the user as verified
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "Email verified successfully!" });
  } catch (err) {
    return next(sendError(400, "invalidToken"));
  }
};

exports.requestPasswordReset = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user) return next(sendError(404, "user"));

  // Generate reset token

  const resetToken = await generateJWT({ id: user._id }, "1h");
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  // Send reset email
  await sendEmail(
    user.email,
    "Password Reset Request",
    `Click to reset: ${resetUrl}`
  );

  res.status(200).json({ message: "Password reset link sent" });
};

exports.confirmPasswordReset = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    // Verify token
    console.log(token, " ", newPassword);

    const decoded = verifyJWT(token); // Extracts { id }
    console.log(decoded);
    if (!decoded) return next(sendError(404, "token"));

    // Find user & update password
    const user = await User.findById(decoded.id);
    if (!user) return next(sendError(404, "user"));

    user.password = newPassword;
    await user.save();

    user.refreshTokens = [];
    clearCookies(res);

    res
      .status(200)
      .json({ message: "Password reset successful. Please log in again." });
  } catch (err) {
    return next(sendError(400, "invalidToken"));
  }
};

// User login
exports.login = async (req, res, next) => {
  const userId = req.user?.id;

  if (userId) {
    return res.status(200).json({
      message: "User is already logged in.",
    });
  }

  const { email, password } = req.body;

  if (!email || !password) return next(sendError(400, "missingFields"));

  const user = await User.findOne({ email });

  if (!user) return next(sendError(404, "user"));

  // Compare the password with the hashed password in the database
  const isMatch = await user.comparePassword(password);

  if (!isMatch) return next(sendError(401, "Invalidcardinalities"));

  if (!user.isVerified) return next(sendError(403, "verifyEmail"));

  // Generate and set tokens
  await generateAndSetTokens(user, res);

  return res.status(200).json({
    message: "User successfully logged In",
    data: {
      user: {
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    },
  });
};

// Get user's account
exports.getUserAccount = async (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) {
    return next(sendError(404, "user"));
  }

  const user = await User.findById(userId)
    .select("username email profilePicture.url")
    .lean();

  if (!user) return next(sendError(404, "user"));

  return res.status(200).json({
    success: true,
    data: {
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture?.url,
    },
  });
};

// Modify user's data
exports.updateAccount = async (req, res, next) => {
  const { username, profilePictureUrl, profilePicturePublic_id } = req.body;
  const user = await validateUser(req, next);

  const duplicateUser = username
    ? await User.findOne({ username: username.toLowerCase() })
    : null;

  // Validate uniqueness
  if (duplicateUser && duplicateUser.id !== user._id) {
    if (duplicateUser.username === username)
      return next(sendError(409, "userExists"));
  }

  // Update username if provided
  if (username) user.username = username;

  // Update profilePicture
  if (profilePictureUrl && profilePicturePublic_id) {
    const oldPublic_id = user.profilePicture.public_id;

    // Update user with the new profile picture info
    user.profilePicture.url = profilePictureUrl;
    user.profilePicture.public_id = profilePicturePublic_id;

    if (oldPublic_id !== process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID) {
      await cloudinaryDelete(oldPublic_id); // Delete the old Picture
    }
  }

  await user.save();
  return res.status(200).json({
    message: "Account successfully updated",
    data: {
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
    },
  });
};

// Modify user's Password
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  const session = await mongoose.startSession();
  session.startTransaction();
  const user = await User.findById(userId).session(session);
  if (!user) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(404, "user"));
  }

  // Check if the current password is correct
  // Compare the password with the hashed password in the database
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(401, "CurrentPassword"));
  }

  // Update the password
  user.password = newPassword; // The pre("save") hook will hash this password

  // Clear all refresh tokens
  user.refreshTokens = [];

  // Save the user (this will trigger schema validation and password hashing)
  await user.save({ session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  clearCookies(res);

  return res.status(200).json({
    message: "Password updated, please log in again.",
  });
};

// Delete user's account
exports.deleteAccount = async (req, res, next) => {
  const user = await validateUser(req, next);

  const session = await mongoose.startSession();
  session.startTransaction();

  const public_id = user.profilePicture.public_id;
  const defaultPicturePublicId = process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID;

  // If the user has a profile photo and it's not the default one, delete it from the filesystem

  if (public_id !== defaultPicturePublicId) {
    await cloudinaryDelete(public_id); // Delete the old Picture
  }

  // Get all loved videos and decrement their lovedCount
  await Video.updateMany(
    { _id: { $in: user.lovedVideos } },
    { $inc: { lovedCount: -1 } }, // Decrease lovedCount by 1
    { session }
  );

  await User.findByIdAndDelete(user._id, { session });

  // Commit transaction
  await session.commitTransaction();
  session.endSession();

  // Clear authentication cookies
  clearCookies(res);

  return res.status(200).json({
    message: "Account successfully deleted",
  });
};

// User logout
exports.logout = async (req, res, next) => {
  const user = await validateUser(req, next);

  const refreshToken = req.cookies.refresh_token;

  // Remove the refresh tokens from the user's array
  await singleDeviceLogout(refreshToken, user);

  // Clear authentication cookies
  clearCookies(res);

  return res.status(200).json({
    message: "Successfully logged out",
  });
};

// Get liked videos
exports.getLovedVideos = async (req, res, next) => {
  const user = await validateUser(req, next);

  const lovedVideos = await Video.find({ _id: { $in: user.lovedVideos } })
    .sort({ createdAt: -1 })
    .lean(); // Use lean() for better performance if read-only

  if (lovedVideos.length === 0) {
    return res.status(200).json({
      message: "User has not loved any videos.",
      videos: [],
    });
  }

  const filteredVideos = lovedVideos.map(
    ({ video, title, lovedBy, grade }) => ({
      url: video.url, // Extract video URL
      title, // Extract title
      lovedByCount: lovedBy.length, // Count lovedBy array
      grade, // Keep grade array
    })
  );

  return res.status(200).json({
    message: "User's loved videos retrieved successfully",
    videos: filteredVideos,
  });
};

// Contact support (send email)
exports.contactSupport = async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  if (!validator.isEmail(email)) return next(sendError(400, "InvalidEmail"));

  const emailContent = `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `;

  await sendEmail(
    "moh18.kh@gmail.com",
    `Support Request: ${subject}`,
    message,
    emailContent
  );

  res.status(201).json({ message: "Your message has been sent successfully." });
};
