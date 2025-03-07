const mongoose = require("mongoose");
const validator = require("validator"); // Import validator.js
const bcrypt = require("bcryptjs");

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long."],
      maxlength: [15, "Username must be less than 15 characters long."],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long."],
      validate: {
        validator: (value) =>
          validator.isStrongPassword(value, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
          }),
        message:
          "Password must contain at least one lowercase, one uppercase, one number, and one special character.",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value), // Validate email format
        message: "Please provide a valid email address.",
      },
    },
    isVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profilePicture: {
      url: {
        type: String,
        maxlength: [
          255,
          "Profile picture URL should be less than 256 characters.",
        ],
        default:
          "https://res.cloudinary.com/dknokwido/image/upload/v1737968225/profilePicture/tdnvzliie0wty93ihodf.jpg",
      },
      public_id: {
        type: String,
        default: "profilePicture/tdnvzliie0wty93ihodf",
      },
    },
    refreshTokens: [refreshTokenSchema],
    lovedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to automatically hash the password
userSchema.pre("save", async function (next) {
  try {
  // Hash password if modified
    if (this.isModified("password")) {
      const hashedPassword = await bcrypt.hash(this.password, 10);
      this.password = hashedPassword;
    }

    next();
  } catch (err) {
    next(err); // Pass the error to the next middleware
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
