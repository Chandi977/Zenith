import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyJWT as isAuthenticated } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  uploadUserData,
  uploadUserPhoto,
  getCurrentUser,
  resetPassword,
  refreshTokens,
  sendOTP,
  verifyOTPAndResetPassword,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Register a new user
router.post("/register", asyncHandler(registerUser));

// Login user
router.post("/login", asyncHandler(loginUser));

// Logout user
router.post("/logout", asyncHandler(logoutUser));

// Get current logged-in user
router.get("/me", isAuthenticated, asyncHandler(getCurrentUser));

// Update user data
router.put("/update/:userId", isAuthenticated, asyncHandler(uploadUserData));

// Upload user profile photo
// Upload user profile photo
router.put(
  "/upload-photo/:userId",
  isAuthenticated,
  upload.single("avatar"), // Add Multer middleware here
  asyncHandler(uploadUserPhoto)
);

// Reset password
router.post("/reset-password", asyncHandler(resetPassword));

// Refresh tokens
router.post("/refresh-tokens", asyncHandler(refreshTokens));

router.post("/send-otp", asyncHandler(sendOTP)); // Send OTP
router.post("/verify-otp", asyncHandler(verifyOTPAndResetPassword)); // Verify OTP & Reset Password
router.post("/reset-password", asyncHandler(resetPassword)); // Reset with old password

export default router;
