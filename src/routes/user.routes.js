import express from "express";
import {
  registerUser, // Registers a new user (Public API) => POST /api/users/register
  loginUser, // Logs in a user (Public API) => POST /api/users/login
  logoutUser, // Logs out a user (Public API) => POST /api/users/logout
  uploadUserData, // Updates user data (Protected API) => PUT /api/users/update/:userId
  uploadUserPhoto, // Uploads user profile photo (Protected API) => POST /api/users/upload-photo/:userId
  getCurrentUser, // Fetches current user details (Protected API) => GET /api/users/me
  resetPassword, // Resets password using OTP (Public API) => POST /api/users/reset-password
  sendOTP, // Sends OTP to user email (Public API) => POST /api/users/send-otp
  refreshTokens, // Refreshes authentication tokens (Public API) => POST /api/users/refresh-tokens
  sendSOSRequest, // Use the comprehensive SOS request function
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js"; // Import Multer middleware

const router = express.Router();

// Public Routes (No authentication required)
router.post("/register", registerUser); // Register a new user
router.post("/login", loginUser); // User login
router.post("/logout", logoutUser); // User logout
router.post("/send-otp", sendOTP); // Send OTP to email
router.post("/reset-password", resetPassword); // Reset password via OTP
router.post("/refresh-tokens", refreshTokens); // Refresh JWT tokens

// Protected Routes (Require Authentication)
router.get("/me", verifyJWT, getCurrentUser); // Fetch current logged-in user data
router.put("/update/:userId", verifyJWT, uploadUserData); // Update user details
router.post(
  "/upload-photo/:userId",
  verifyJWT,
  upload.single("avatar"), // Use Multer middleware to handle single file upload
  uploadUserPhoto
); // Upload user profile photo

// SOS Routes
router.post("/send-sos", verifyJWT, sendSOSRequest); // Send SOS message using sendSOSRequest
// router.get("/receive-sos", verifyJWT, receiveSOS); // Receive SOS messages

export default router;
