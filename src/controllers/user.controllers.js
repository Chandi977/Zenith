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
import {
  sendOTP,
  verifyOTP,
  verifyOTPProgrammatically,
} from "./otp.controller.js"; // Import verifyOTPProgrammatically
import bcrypt from "bcryptjs";
import SOS from "../models/sos.model.js";
import { sendNotification } from "../utils/sendNotification.js";
import { findDriversInRange } from "./ambulanceDriver.controller.js";
import { assignDriverAndNotify } from "./ambulance.controllers.js";
import {
  findNearestHospital,
  calculateETA,
  calculateDistance,
  generateMapLink, // Import the function
} from "../utils/googleMaps.js"; // Add calculateDistance to the import

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

  // Use the helper function to verify OTP
  await verifyOTPProgrammatically(email, otp);

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

  // Use the helper function to verify OTP
  await verifyOTPProgrammatically(email || user.email, otp);

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

  // Use the helper function to verify OTP
  await verifyOTPProgrammatically(email, otp);

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Hash the new password before saving
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

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

  // Check if a file was uploaded
  if (!req.file) {
    throw new ApiError(400, "No image provided");
  }

  const avatarBuffer = req.file.buffer; // Access the file buffer directly

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const avatar = await uploadOnCloudinary(avatarBuffer, "avatars"); // Upload to Cloudinary
  if (!avatar) {
    throw new ApiError(500, "Error uploading avatar");
  }

  user.avatar = avatar; // Save the uploaded avatar URL
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

const sendSOSRequest = asyncHandler(async (req, res) => {
  const { userId, selectedLocation } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const currentLocation = req.body.currentLocation;

  if (!currentLocation && !selectedLocation) {
    throw new ApiError(
      400,
      "Either current location or selected location is required"
    );
  }

  const location = selectedLocation || currentLocation;

  if (!location.latitude || !location.longitude) {
    throw new ApiError(400, "Valid location (latitude, longitude) is required");
  }

  const reachableRange = 10; // Initial range in km
  const maxRange = 50; // Maximum range in km
  let driversInRange = [];

  while (reachableRange <= maxRange) {
    driversInRange = await findDriversInRange(location, reachableRange);

    if (driversInRange.length > 0) break;

    reachableRange += 10; // Increase range by 10 km
  }

  if (driversInRange.length === 0) {
    return res
      .status(404)
      .json(
        new ApiResponse(
          404,
          {},
          "No ambulance drivers available within the reachable range"
        )
      );
  }

  const { sosRequest, assignedDriver } = await assignDriverAndNotify(
    userId,
    location,
    driversInRange
  );

  // Fetch the nearest hospital
  const hospital = await findNearestHospital(location);

  if (!hospital) {
    throw new ApiError(404, "No nearby hospital found.");
  }

  // Use a default speed if assignedDriver.speed is invalid
  const driverSpeed = assignedDriver.speed > 0 ? assignedDriver.speed : 40; // Default speed: 40 km/h

  // Validate startLocation before generating the map link
  const startLocation = {
    latitude: assignedDriver.latitude || 0,
    longitude: assignedDriver.longitude || 0,
  };

  if (!startLocation.latitude || !startLocation.longitude) {
    throw new ApiError(400, "Invalid startLocation for map link generation.");
  }

  // Prepare notification details
  const notification = {
    type: "AMBULANCE_ON_THE_WAY",
    hospitalName: hospital.name,
    ambulanceDetails: {
      expectedTime: calculateETA(location, hospital.location, driverSpeed),
      distance: calculateDistance(location, hospital.location),
      speed: driverSpeed,
      mapLink: generateMapLink(startLocation, hospital.location), // Ensure hospital.location uses latitude/longitude
    },
  };

  // Send notification to the user
  await sendNotification(userId, notification);

  return res
    .status(200)
    .json(new ApiResponse(200, sosRequest, "SOS request sent successfully"));
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
  refreshTokens,
  sendSOSRequest, // Use sendSOSRequest for SOS functionality
  verifyOTP,
};
