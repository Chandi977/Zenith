import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import events from "events";
import admin from "firebase-admin";

const app = express();

// ✅ Define allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:54979", // Add any frontend port you are using
  "https://your-production-frontend.com", // Add your deployed frontend domain
];

// ✅ CORS options setup
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl or mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-access-token",
    "Origin",
    "Accept",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400,
};

// ✅ Apply CORS middleware FIRST
app.use(cors(corsOptions));

// ✅ Core Middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ✅ Import Routes
import otpRoutes from "./routes/otp.routes.js";
import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import ambulanceRouter from "./routes/ambulance.routes.js";
import ambulanceDriver from "./routes/ambulanceDriver.routes.js";
import hospitalRouter from "./routes/hospital.routes.js";

// ✅ Firebase Admin SDK Init
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
});

// ✅ Routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/ambulance", ambulanceRouter);
app.use("/api/v1/ambulanceDriver", ambulanceDriver);
app.use("/api/v1/hospital", hospitalRouter);

// ✅ 404 Fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ✅ Background Job or Init Task
import { rotateDriverShifts } from "./controllers/ambulanceDriver.controller.js";
rotateDriverShifts();

// ✅ Max Event Listeners
events.EventEmitter.defaultMaxListeners = 50;

export { app };
