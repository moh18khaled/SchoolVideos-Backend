const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const videoRoutes = require("./routes/videoRoutes");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");
const rateLimit = require("express-rate-limit");
const globalError = require("./middlewares/globalError");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
dotenv.config();

const app = express();
 
// Serve frontend only AFTER API routes
app.use(express.static(path.join(__dirname, "client", "dist")));


app.use(express.json());
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:5173", // Local development
  "https://schoolvideos-backend-production.up.railway.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


// Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use(limiter);

// Security Enhancements
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "default-src": ["'self'"],
      "img-src": ["*"], // Allows images from any source
      "connect-src": ["'self'",  "http://localhost:5000",
        "https://schoolvideos-backend-production.up.railway.app",
        "https://api.cloudinary.com",
      ], // Allow backend API requests
      "frame-src": ["'self'", "https://res.cloudinary.com", "https://www.youtube.com"], // Allow Cloudinary and YouTube in iframes
    },
  })
);
// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err.message));

  // Use API routes BEFORE serving frontend
  app.use("/users", userRoutes); // Pluralized for consistency
  app.use("/videos", videoRoutes);  

// Default API Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the Backend!");
});


// Global Error Handling
app.use(globalError);

app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// Handle Invalid API Routes
app.all("*", (req, res, next) => {
  next(new AppError("Cannot find this route", 404));
});


module.exports = app;
