import express from "express"; // Import Express framework
import cors from "cors"; // Import CORS middleware
import cookieParser from "cookie-parser"; // Import Cookie parser middleware

const app = express(); // Create an instance of Express

// Configure CORS to allow requests from specified origin and enable credentials
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Allowed origin for CORS requests
    credentials: true, // Enable sending credentials (e.g., cookies) with CORS requests
  })
);

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
// import hospitalRouter from "./routes/hospital.routes.js";
// import routeRouter from "./routes/route.routes.js";

// Define routes for the API version 1, using the imported userRouter
//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/ambulance", ambulanceRouter);
app.use("/api/v1/ambulanceDriver", ambulanceDriver);
// app.use("/api/v1/hospital", hospitalRouter);
// app.use("/api/v1/route", routeRouter);

export { app }; // Export the Express app for use in other modules
