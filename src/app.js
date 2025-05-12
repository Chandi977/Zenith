import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import events from "events";
import admin from "firebase-admin";

const app = express();

// Place CORS configuration first, before any other middleware
app.use(
  cors({
    origin: true, // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
    maxAge: 86400, // Cache preflight request for 24 hours
  })
);

// Handle preflight requests
app.options("*", cors());

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import otpRoutes from "./routes/otp.routes.js";
import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import ambulanceRouter from "./routes/ambulance.routes.js";
import ambulanceDriver from "./routes/ambulanceDriver.routes.js";
import hospitalRouter from "./routes/hospital.routes.js";

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
app.use("/api/v1/hospital", hospitalRouter);

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

import { rotateDriverShifts } from "./controllers/ambulanceDriver.controller.js";
rotateDriverShifts();

events.EventEmitter.defaultMaxListeners = 50;
export { app };
