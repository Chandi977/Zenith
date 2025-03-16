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
import OTP from "../models/otp.model.js";
import { sendOTP } from "./otp.controller.js";
import bcrypt from "bcryptjs";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password, address, mobileNumber, otp } =
    req.body;

  if (!fullName || !email || !username || !password || !otp) {
    throw new ApiError(
      400,
      "Full Name, Email, Username, Password, and OTP are required"
    );
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // ✅ Reuse OTP verification function
  await verifyOTP(email, otp);

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    address: address || "",
    mobileNumber: mobileNumber || "",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password, otp } = req.body;

  if ((!email && !username) || !password || !otp) {
    throw new ApiError(400, "Email/Username, Password, and OTP are required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(401, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // ✅ Reuse OTP verification function
  await verifyOTP(email || user.email, otp);

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true })
    .json(new ApiResponse(200, user, "Login successful"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword, otp } = req.body;

  if (!email || !newPassword || !otp) {
    throw new ApiError(400, "Email, new password, and OTP are required");
  }

  // ✅ Reuse OTP verification function
  await verifyOTP(email, otp);

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ✅ Hash the new password before saving
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const verifyOTP = async (email, otp) => {
  const validOTP = await OTP.findOne({
    email,
    expiresAt: { $gt: new Date() }, // Ensure OTP is not expired
  });

  if (!validOTP || !(await bcrypt.compare(otp, validOTP.otp))) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  await OTP.deleteOne({ _id: validOTP._id }); // ✅ Remove OTP after verification
};

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.status(200).json(new ApiResponse(200, {}, "Logout successful"));
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

export {
  registerUser,
  loginUser,
  logoutUser,
  uploadUserData,
  uploadUserPhoto,
  getCurrentUser,
  resetPassword,
  sendOTP,
  refreshTokens,
};
