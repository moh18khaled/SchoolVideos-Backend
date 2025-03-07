const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },
    video: {
      url: { type: String, required: true }, // Ensure every video has a URL
      public_id: { type: String, required: true },
    },
    lovedCount: { type: Number, default: 0, min: 0 },  // Number of times added to lovedVideos

    grade: {
      type: [Number], // Array of numbers
      required: true,
      validate: {
        validator: function (grades) {
          return grades.every((grade) => grade >= 1 && grade <= 12);
        },
        message: "Grade must be between 1 and 12.",
      },
    },
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
