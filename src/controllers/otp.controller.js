import asyncHandler from "express-async-handler";
import otpGenerator from "otp-generator";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { User } from "../models/user.model.js";
import Ambulance from "../models/ambulance.model.js";
import Driver from "../models/ambulanceDriver.model.js";
import OTP from "../models/otp.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @desc Send OTP for User, Ambulance, or Driver for Registration, Login, or Password Reset
 * @route POST /api/otp/send
 * @access Public
 */
const sendOTP = asyncHandler(async (req, res) => {
  const { email, userType, otpPurpose } = req.body;

  if (!email || !userType || !otpPurpose) {
    throw new ApiError(400, "Email, userType, and otpPurpose are required");
  }

  const validPurposes = ["register", "login", "resetPassword"];
  if (!validPurposes.includes(otpPurpose)) {
    throw new ApiError(
      400,
      "Invalid OTP purpose. Use register, login, or resetPassword."
    );
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase();

  // Check if user exists based on userType
  let existingUser =
    userType === "user"
      ? await User.findOne({ email: normalizedEmail })
      : userType === "ambulance"
        ? await Driver.findOne({ email: normalizedEmail }) // Fetch from ambulanceDriver
        : await Driver.findOne({ email: normalizedEmail });

  if (otpPurpose !== "register" && !existingUser) {
    throw new ApiError(404, "User not found. Please register first.");
  }

  if (otpPurpose === "register" && existingUser) {
    throw new ApiError(400, "User already exists. Please log in.");
  }

  // Remove any previous OTP for the email
  await OTP.deleteMany({ email: normalizedEmail });

  // Generate a new OTP
  const otpCode = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    specialChars: false,
  });

  // Hash the OTP
  const hashedOTP = await bcrypt.hash(otpCode, 10);

  // Save OTP to the database
  await OTP.create({
    email: normalizedEmail,
    otp: hashedOTP,
    expiresAt: new Date(Date.now() + 5 * 60000), // Expires in 5 minutes
  });

  // Dynamic subject and message based on OTP purpose and userType
  let subject, message;
  const userTypeFormatted =
    userType === "user"
      ? "User"
      : userType === "ambulance"
        ? "Ambulance Service Provider"
        : "Driver";

  switch (otpPurpose) {
    case "register":
      subject = `Zenith ${userTypeFormatted} Registration OTP`;
      message = `Dear ${userTypeFormatted},\n\nWelcome to Zenith! To complete your registration, please use the following One-Time Password (OTP): **${otpCode}**.\n\nThis OTP is valid for **5 minutes**.\n\nIf you did not request this, please ignore this email.\n\nBest Regards,\nZenith Support Team`;
      break;
    case "login":
      subject = `Zenith ${userTypeFormatted} Login OTP`;
      message = `Dear ${userTypeFormatted},\n\nTo securely log in to your Zenith account, please use the following OTP: **${otpCode}**.\n\nThis OTP is valid for **5 minutes**. If you did not request this, please ignore this email.\n\nBest Regards,\nZenith Security Team`;
      break;
    case "resetPassword":
      subject = `Zenith ${userTypeFormatted} Password Reset OTP`;
      message = `Dear ${userTypeFormatted},\n\nWe received a request to reset your password. Use the following OTP to proceed: **${otpCode}**.\n\nThis OTP will expire in **5 minutes**. If you did not request this, please ignore this email.\n\nBest Regards,\nZenith Support Team`;
      break;
    default:
      subject = "Zenith OTP Verification";
      message = `Your One-Time Password (OTP) is: **${otpCode}**.\n\nIt is valid for **5 minutes**. If you did not request this, please ignore this email.`;
  }

  // Configure Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Zenith Security" <${process.env.EMAIL_USER}>`,
    to: normalizedEmail,
    subject,
    text: message,
  };

  await transporter.sendMail(mailOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, `OTP sent for ${otpPurpose}`));
});

/**
 * @desc Verify OTP for User, Ambulance, or Driver
 * @route POST /api/otp/verify
 * @access Public
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord) {
    throw new ApiError(400, "OTP not found or expired");
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  if (!isMatch) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ email }); // Clean up expired OTP
    throw new ApiError(400, "OTP has expired");
  }

  await OTP.deleteOne({ email }); // Delete OTP after successful verification

  // If called programmatically, return success
  if (!res) return true;

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP verified successfully"));
});

// Helper function for programmatic OTP verification
const verifyOTPProgrammatically = async (email, otp) => {
  return verifyOTP({ body: { email, otp } });
};

export { sendOTP, verifyOTP, verifyOTPProgrammatically };
