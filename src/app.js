import express from "express"; // Import Express framework
import cors from "cors"; // Import CORS middleware
import cookieParser from "cookie-parser"; // Import Cookie parser middleware
import events from "events"; // Import events module
import admin from "firebase-admin"; // Firebase Admin SDK

const app = express(); // Create an instance of Express

// Updated CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:54979",
      "https://zenith-oy4b.onrender.com",
      "http://localhost:8080",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Add headers middleware for additional CORS handling
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-access-token"
  );
  next();
});

app.use(express.json());

// Middleware to parse JSON request bodies with a limit of 16kb
app.use(express.json({ limit: "16kb" }));

// Middleware to parse URL-encoded request bodies with a limit of 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Middleware to serve static files from the 'public' directory
app.use(express.static("public"));

// Middleware to parse cookies from the request
app.use(cookieParser());

// Import routes
import otpRoutes from "./routes/otp.routes.js";
import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import ambulanceRouter from "./routes/ambulance.routes.js";
import ambulanceDriver from "./routes/ambulanceDriver.routes.js";
import hospitalRouter from "./routes/hospital.routes.js"; // Import hospital routes
// import routeRouter from "./routes/route.routes.js"; // Uncommented

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
});

// Define routes for the API version 1, using the imported routers
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/ambulance", ambulanceRouter);
app.use("/api/v1/ambulanceDriver", ambulanceDriver);
app.use("/api/v1/hospital", hospitalRouter); // Add hospital routes
// app.use("/api/v1/route", routeRouter); // Added

// Fallback route for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

import { rotateDriverShifts } from "./controllers/ambulanceDriver.controller.js"; // Adjust path if needed
rotateDriverShifts(); // Ensure it's triggered initially

// Increase WebSocket listener limits
events.EventEmitter.defaultMaxListeners = 50; // Increase the listener limit
export { app }; // Export the Express app for use in other modules
