import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  removeFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import OTP from "../models/otp.model.js"; // Create an OTP model
import bcrypt from "bcrypt";

const generateAccessAndRefreshTokens = async (user) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens", error);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password, address, mobileNumber } =
    req.body;

  if (!fullName || !email || !username || !password) {
    throw new ApiError(
      400,
      "Full Name, Email, Username, and Password are required"
    );
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let avatar = null;
  if (avatarLocalPath) {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, "Error uploading avatar");
    }
  }

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar?.url || "",
    address: address || "",
    mobileNumber: mobileNumber || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User registration failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const uploadUserData = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { address, mobileNumber, additionalData } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.address = address || user.address;
  user.mobileNumber = mobileNumber || user.mobileNumber;
  user.additionalData = additionalData || user.additionalData;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User data updated successfully"));
});

const uploadUserPhoto = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  //   console.log("Received File:", req.file); // Debugging

  // Fix: Access req.file directly (Multer's `single` method does not use `req.files`)
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "No image provided");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(500, "Error uploading avatar");
  }

  user.avatar = avatar.url;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User photo uploaded successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Email or Username is required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(401, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(new ApiResponse(200, loggedInUser, "Login successful"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.user.id) } },
    { $project: { password: 0, refreshToken: 0 } },
  ]);
  if (!user.length) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "Current user fetched successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.status(200).json(new ApiResponse(200, {}, "Logout successful"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    throw new ApiError(400, "Email and new password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

// ✅ Send OTP for Password Reset
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ❌ Remove any existing OTP for this email
  await OTP.deleteMany({ email });

  // Generate a 6-digit OTP
  const otpCode = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    specialChars: false,
  });

  // ✅ Hash the OTP before saving
  const hashedOTP = await bcrypt.hash(otpCode, 10);

  await OTP.create({
    email,
    otp: hashedOTP, // ✅ Store the hashed OTP
    expiresAt: new Date(Date.now() + 5 * 60000),
  });

  // Configure nodemailer to send email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset OTP",
    text: `Your OTP for password reset is: ${otpCode}. It will expire in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully"));
});

// ✅ Verify OTP & Reset Password

const verifyOTPAndResetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP, and new password are required");
  }

  // Find OTP record
  const validOTP = await OTP.findOne({ email });
  if (!validOTP) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // ✅ Compare the provided OTP with the stored hashed OTP
  const isOTPValid = await bcrypt.compare(otp, validOTP.otp);
  if (!isOTPValid) {
    throw new ApiError(400, "Invalid OTP");
  }

  // Check OTP expiry
  if (validOTP.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: validOTP._id });
    throw new ApiError(400, "OTP expired. Request a new one.");
  }

  // Find user & update password
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ✅ Hash new password before saving
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  // ❌ Delete the used OTP only after password update
  await OTP.deleteOne({ _id: validOTP._id });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🔐 Password Reset Successful - Zenith Support",
      text: `Dear User,
      
      We wanted to let you know that your password has been successfully reset. If you requested this change, no further action is needed.
      
      However, if you did not request this change, please **secure your account immediately** by resetting your password again or contacting our support team.
      
      📌 **Need Help?**  
      If you have any concerns or need assistance, feel free to reach out to us at:  
      📧 **Support Email:** charan.f.sde@gmail.com  
      
      Best regards,  
      **Zenith Support Team**   
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response); // Log success
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error); // Log error but continue
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

// export { sendOTP, verifyOTPAndResetPassword };

const refreshTokens = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  const user = await User.findOne({ refreshToken });
  if (!user) {
    throw new ApiError(403, "Invalid refresh token");
  }

  const { accessToken, newRefreshToken } =
    await generateAccessAndRefreshTokens(user);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", newRefreshToken, { httpOnly: true, secure: true })
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Tokens refreshed successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  uploadUserData,
  uploadUserPhoto,
  getCurrentUser,
  resetPassword,
  sendOTP,
  verifyOTPAndResetPassword,
  refreshTokens,
};
