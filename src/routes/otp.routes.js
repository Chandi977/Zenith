import express from "express";
import { sendOTP } from "../controllers/otp.controller.js";

const router = express.Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP for registration, login, or password reset
 * @access  Public
 */
router.post("/send", sendOTP);

export default router;
