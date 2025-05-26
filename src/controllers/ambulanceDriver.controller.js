import { validationResult } from "express-validator";
import AmbulanceDriver from "../models/ambulanceDriver.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Ensure this is the correct import
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing
import jwt from "jsonwebtoken";
import cron from "node-cron";
import EventEmitter from "events"; // Import EventEmitter to handle SOS events
import axios from "axios"; // Import axios for making HTTP requests
import dotenv from "dotenv"; // Import dotenv to load environment variables
import { calculateDistance } from "./route.controllers.js"; // Import calculateDistance
import SOS from "../models/sos.model.js"; // Import the SOS model
import { sendNotification } from "../utils/sendNotification.js"; // Import the sendNotification function
import Hospital from "../models/hospital.models.js"; // Import the Hospital model
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyOTPProgrammatically } from "./otp.controller.js";
import { getAddressCoordinates } from "../utils/googleMaps.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"; // Change to named import
dotenv.config();

const sosEventEmitter = new EventEmitter(); // Create an event emitter instance

// Create a new ambulance driver
const createAmbulanceDriver = async (req, res) => {
  try {
    const {
      driverName,
      email,
      password,
      contactNumber,
      driverLicense,
      age,
      drivingExperience,
      govtIdProof,
      govtIdNumber,
      driverPhoto,
      available,
      assignedShift,
      latitude,
      longitude,
      otp,
    } = req.body;

    // Enhanced validation with specific error messages
    const requiredFields = {
      driverName,
      email,
      password,
      contactNumber,
      age,
      drivingExperience,
      govtIdNumber,
      assignedShift,
      latitude,
      longitude,
      otp,
    };
    console.log(req.body);

    // Check all required fields
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        missingFields,
      });
    }

    // Validate numeric fields
    if (age < 18) {
      return res.status(400).json({
        message: "Driver must be at least 18 years old",
      });
    }

    if (drivingExperience < 0 || drivingExperience > 99) {
      return res.status(400).json({
        message: "Driving experience must be between 0 and 99 years",
      });
    }

    // Hash password once during registration
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("\nRegistration Debug:");
    console.log("Password hashed once");

    // Create new driver with all required fields
    const newDriver = new AmbulanceDriver({
      driverName,
      email,
      password: hashedPassword,
      contactNumber,
      age,
      drivingExperience,
      govtIdNumber,
      available: available ?? true,
      assignedShift,
      latitude,
      longitude,
    });

    await newDriver.save();

    // Remove sensitive data from response
    const createdDriver = newDriver.toObject();
    delete createdDriver.password;

    return res.status(201).json({
      message: "Ambulance driver created successfully",
      driver: createdDriver,
    });
  } catch (error) {
    console.error("Driver registration error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      message: "Error creating ambulance driver",
      error: error.message,
    });
  }
};

const loginAmbulanceDriver = asyncHandler(async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    // Input validation
    if (!email || !password || !otp) {
      throw new ApiError(400, "Email, password, and OTP are required");
    }

    // Find driver
    const driver = await AmbulanceDriver.findOne({ email })
      .select("+password")
      .exec();

    if (!driver) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, driver.password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Verify OTP with userType
    await verifyOTPProgrammatically(email, otp, "driver");

    // Generate tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(driver);

    // Get driver without sensitive data
    const loggedInDriver = driver.toObject();
    delete loggedInDriver.password;
    delete loggedInDriver.refreshToken;

    // Set cookies and send response
    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      })
      .json(
        new ApiResponse(
          200,
          {
            driver: loggedInDriver,
            accessToken,
            refreshToken,
          },
          "Login successful"
        )
      );
  } catch (error) {
    console.error("Login failed:", error);
    throw new ApiError(
      error.statusCode || 401,
      error.message || "Authentication failed"
    );
  }
});

// const loginAmbulanceDriver = asyncHandler(async (req, res) => {
//   const { email, password, otp } = req.body;

//   if (!email || !password || !otp) {
//     throw new ApiError(400, "Email, password, and OTP are required");
//   }

//   // Find driver and explicitly select password field
//   const driver = await AmbulanceDriver.findOne({ email }).select("+password");
//   if (!driver) {
//     throw new ApiError(401, "Driver not found");
//   }

//   console.log("Login attempt for:", email);
//   console.log("Password received:", password);

//   // Try direct bcrypt compare for debugging
//   try {
//     const directCompare = await bcrypt.compare(password, driver.password);
//     console.log("Direct bcrypt compare result:", directCompare);
//   } catch (error) {
//     console.error("Direct compare error:", error);
//   }

//   const isPasswordValid = await driver.isPasswordCorrect(password);
//   if (!isPasswordValid) {
//     throw new ApiError(401, "Invalid credentials");
//   }

//   await verifyOTPProgrammatically(email, otp);

//   const token = jwt.sign({ userId: driver._id }, process.env.JWT_SECRET, {
//     expiresIn: "1h",
//   });

//   return res
//     .status(200)
//     .cookie("token", token, { httpOnly: true })
//     .json(
//       new ApiResponse(
//         200,
//         {
//           userId: driver.userId,
//           driverName: driver.driverName,
//           email: driver.email,
//           token,
//         },
//         "Login successful"
//       )
//     );
// });

// Get all ambulance drivers
const getAllAmbulanceDrivers = async (req, res) => {
  try {
    const drivers = await AmbulanceDriver.find().populate("ambulance");
    res.status(200).json({
      message: "Ambulance drivers retrieved successfully",
      drivers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving ambulance drivers",
      error: error.message,
    });
  }
};

// Fetch a single ambulance driver by ID
const getAmbulanceDriverById = async (req, res) => {
  try {
    const driver = await AmbulanceDriver.findById(req.params.id).populate(
      "ambulance"
    );
    if (!driver) {
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }

    // Calculate the average rating
    const ratingsCount = driver.userRatings.length;
    const sumRatings = driver.userRatings.reduce(
      (acc, rating) => acc + rating,
      0
    );
    const averageRating =
      ratingsCount > 0 ? (sumRatings / ratingsCount).toFixed(2) : 0;

    // Add averageRating to the response
    res.status(200).json({
      message: "Ambulance driver retrieved successfully",
      driver,
      averageRating,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving ambulance driver",
      error: error.message,
    });
  }
};

// Update ambulance driver details
const updateAmbulanceDriver = async (req, res) => {
  try {
    const driver = await AmbulanceDriver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }

    const {
      driverName,
      contactNumber,
      age,
      drivingExperience,
      govtIdNumber,
      available,
      assignedShift,
      email,
      location,
    } = req.body;

    // Update fields if provided
    if (driverName) driver.driverName = driverName;
    if (contactNumber) driver.contactNumber = contactNumber;
    if (age) driver.age = age;
    if (drivingExperience) driver.drivingExperience = drivingExperience;
    if (govtIdNumber) driver.govtIdNumber = govtIdNumber;
    if (available != null) driver.available = available;
    if (assignedShift) driver.assignedShift = assignedShift;
    if (email) driver.email = email;

    if (location && location.latitude && location.longitude) {
      driver.location = location; // Update driver's location
    }

    // Handle file uploads if provided
    const files = req.files;
    if (files?.driverLicense) {
      driver.driverLicense = await uploadOnCloudinary(
        files.driverLicense[0].buffer,
        "driverLicense"
      );
    }
    if (files?.govtIdProof) {
      driver.govtIdProof = await uploadOnCloudinary(
        files.govtIdProof[0].buffer,
        "govtIdProof"
      );
    }
    if (files?.driverPhoto) {
      driver.driverPhoto = await uploadOnCloudinary(
        files.driverPhoto[0].buffer,
        "driverPhoto"
      );
    }

    // Save updated driver
    await driver.save();

    res.status(200).json({
      message: "Ambulance driver updated successfully",
      driver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating ambulance driver",
      error: error.message,
    });
  }
};

// Delete an ambulance driver
const deleteAmbulanceDriver = async (req, res) => {
  try {
    const driver = await AmbulanceDriver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: "Ambulance driver not found" });
    }

    // Optionally, clean up related resources (e.g., files on Cloudinary)
    if (driver.driverLicense) {
      // Add logic to delete driverLicense from Cloudinary if needed
    }
    if (driver.govtIdProof) {
      // Add logic to delete govtIdProof from Cloudinary if needed
    }
    if (driver.driverPhoto) {
      // Add logic to delete driverPhoto from Cloudinary if needed
    }

    res.status(200).json({ message: "Ambulance driver deleted successfully" });
  } catch (error) {
    console.error("Error deleting ambulance driver: ", error.message);
    res.status(500).json({
      message: "Error deleting ambulance driver",
      error: error.message,
    });
  }
};

// Update the shift of an ambulance driver
const updateDriverShift = async (req, res) => {
  try {
    const driver = await AmbulanceDriver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }

    driver.assignedShift = req.body.assignedShift; // Update the shift
    await driver.save();

    res.status(200).json({
      message: "Driver shift updated successfully",
      driver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating driver shift",
      error: error.message,
    });
  }
};

const rotateDriverShifts = async () => {
  try {
    const drivers = await AmbulanceDriver.find(); // Fetch all drivers

    for (const driver of drivers) {
      // Normalize assignedShift capitalization (if it's incorrect in the DB)
      driver.assignedShift =
        driver.assignedShift.charAt(0).toUpperCase() +
        driver.assignedShift.slice(1).toLowerCase();

      // Rotate shifts
      switch (driver.assignedShift) {
        case "Morning":
          driver.assignedShift = "Afternoon";
          break;
        case "Afternoon":
          driver.assignedShift = "Night";
          break;
        case "Night":
          driver.assignedShift = "Morning";
          break;
        default:
          console.warn(
            `⚠️ Invalid shift detected for driver ${driver._id}: ${driver.assignedShift}`
          );
          continue; // Skip saving if invalid
      }

      await driver.save(); // Save updated shift
    }

    console.log("✅ Driver shifts updated successfully!");
  } catch (error) {
    console.error("❌ Error rotating driver shifts:", error.message);
  }
};

// Schedule this function to run every Sunday at midnight
cron.schedule(
  "0 0 * * 0",
  async () => {
    try {
      await rotateDriverShifts(); // Ensure proper scheduling
      console.log("✅ Driver shifts rotated successfully.");
    } catch (error) {
      console.error("❌ Error rotating driver shifts:", error.message);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);

// Add a rating to a driver
const addDriverRating = async (req, res) => {
  try {
    const driver = await AmbulanceDriver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }

    const { userId, rating } = req.body;
    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be a number between 0 and 5",
      });
    }

    // Ensure userRatings is an array of objects
    if (!Array.isArray(driver.userRatings)) {
      driver.userRatings = [];
    }

    // Check if the user has already rated
    const existingRatingIndex = driver.userRatings.findIndex(
      (r) => r.userId?.toString() === userId.toString()
    );

    if (existingRatingIndex !== -1) {
      // Update the existing rating
      driver.userRatings[existingRatingIndex].rating = rating;
    } else {
      // Add a new rating
      driver.userRatings.push({ userId, rating });
    }

    // Calculate the new average rating
    const totalRatings = driver.userRatings.length;
    const sumRatings = driver.userRatings.reduce((sum, r) => sum + r.rating, 0);
    driver.averageRating = (sumRatings / totalRatings).toFixed(1); // Round to 1 decimal place

    // Save the updated driver data
    await driver.save();

    res.status(200).json({
      message: "Rating added/updated successfully",
      averageRating: driver.averageRating,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding/updating rating to driver",
      error: error.message,
    });
  }
};

const receiveSOSNotification = async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        message: "User ID and location (latitude and longitude) are required",
      });
    }

    const availableDriver = await AmbulanceDriver.findOne({ available: true })
      .sort({ rating: -1 }) // Prioritize drivers with higher ratings
      .exec();

    if (!availableDriver) {
      return res.status(404).json({
        message: "No available ambulance drivers at the moment",
      });
    }

    availableDriver.available = false; // Mark driver as unavailable
    availableDriver.assignedShift = "SOS"; // Assign SOS shift
    await availableDriver.save();

    res.status(200).json({
      message: "SOS request received and driver assigned",
      driver: {
        userId: availableDriver.userId,
        driverName: availableDriver.driverName,
        contactNumber: availableDriver.contactNumber,
        ambulance: availableDriver.ambulance,
        location: {
          latitude: latitude,
          longitude: longitude,
        },
      },
    });

    console.log(
      `🚨 SOS Notification: Driver ${availableDriver.driverName} assigned to user ${userId} at location (${latitude}, ${longitude})`
    );
  } catch (error) {
    console.error("Error handling SOS notification:", error.message);
    res.status(500).json({
      message: "Error handling SOS notification",
      error: error.message,
    });
  }
};

// Enhanced SOS event listener
sosEventEmitter.on("sosRequest", async (sosData) => {
  try {
    const { userId, latitude, longitude } = sosData;

    if (!userId || !latitude || !longitude) {
      console.error(
        "Invalid SOS request data: User ID and location are required"
      );
      return;
    }

    const availableDriver = await AmbulanceDriver.findOne({ available: true })
      .sort({ rating: -1 })
      .exec();

    if (!availableDriver) {
      console.error("No available ambulance drivers at the moment");
      return;
    }

    availableDriver.available = false;
    availableDriver.assignedShift = "SOS";
    await availableDriver.save();

    console.log(
      `🚨 SOS Notification: Driver ${availableDriver.driverName} assigned to user ${userId} at location (${latitude}, ${longitude})`
    );

    // Notify driver via external service (e.g., SMS or push notification)
    try {
      await axios.post(process.env.NOTIFICATION_SERVICE_URL, {
        driverId: availableDriver.userId,
        location,
      });
      console.log("Driver notified successfully");
    } catch (notifyError) {
      console.error("Failed to notify driver:", notifyError.message);
    }
  } catch (error) {
    console.error("Error handling SOS notification:", error.message);
  }
});

// Function to trigger SOS event
const handleSOSRequest = (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    // Emit the SOS event with the request data
    sosEventEmitter.emit("sosRequest", { userId, latitude, longitude });

    res.status(200).json({
      message: "SOS request received and being processed",
    });
  } catch (error) {
    console.error("Error triggering SOS request:", error.message);
    res.status(500).json({
      message: "Error triggering SOS request",
      error: error.message,
    });
  }
};

// Enhanced hospital fetching with retries
const fetchHospitalsFromGoogleMaps = async (req, res) => {
  try {
    const { location, radius } = req.query;

    if (!location || !radius) {
      return res.status(400).json({
        error: "Missing required query parameters: location or radius",
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Google Maps API key is not configured" });
    }

    const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=hospital&key=${apiKey}`;

    let attempts = 0;
    let response;

    while (attempts < 3) {
      try {
        response = await axios.get(googleMapsUrl);
        break; // Exit loop if successful
      } catch (error) {
        attempts++;
        console.warn(
          `Attempt ${attempts}: Failed to fetch hospitals - ${error.message}`
        );
        if (attempts === 3) {
          throw new Error("Max retries reached for fetching hospitals");
        }
      }
    }

    res.status(200).json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch hospitals", details: error.message });
  }
};

// Add a new endpoint to update the driver's location
const updateDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required",
      });
    }

    const driver = await AmbulanceDriver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    driver.latitude = latitude;
    driver.longitude = longitude;
    await driver.save();

    res.status(200).json({
      message: "Driver location updated successfully",
      latitude: driver.latitude,
      longitude: driver.longitude,
    });
  } catch (error) {
    console.error("Error updating driver location:", error.message);
    res.status(500).json({
      message: "Error updating driver location",
      error: error.message,
    });
  }
};

const handleRerouting = async (req, res) => {
  const { driverId, currentLocation, destination } = req.body;

  if (!driverId || !currentLocation || !destination) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const driver = await AmbulanceDriver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const reroutedPath = await getDirections(currentLocation, destination);
    res.status(200).json({
      message: "Rerouting successful",
      path: reroutedPath,
    });
  } catch (error) {
    console.error("Error in rerouting:", error.message);
    res
      .status(500)
      .json({ message: "Error in rerouting", error: error.message });
  }
};

function assignAmbulanceDriver(req, res) {
  const { driverId, ambulanceId } = req.body;

  // Validate input
  if (!driverId || !ambulanceId) {
    return res
      .status(400)
      .json({ error: "Driver ID and Ambulance ID are required." });
  }

  // Assign driver to ambulance (mock logic)
  const assignment = {
    driverId,
    ambulanceId,
    status: "Assigned",
    assignedAt: new Date(),
  };

  res.status(200).json(assignment);
}

const findDriversInRange = async (location, reachableRange) => {
  const ambulanceDrivers = await AmbulanceDriver.find({
    latitude: { $exists: true },
    longitude: { $exists: true },
  });

  return ambulanceDrivers.filter((driver) => {
    if (!driver.latitude || !driver.longitude) return false;

    const distance = calculateDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: driver.latitude, longitude: driver.longitude }
    );

    return distance <= reachableRange;
  });
};

const assignDriverAndNotify = async (user, location, driversInRange) => {
  const nearestDrivers = driversInRange
    .sort(
      (a, b) =>
        calculateDistance(location, {
          latitude: a.latitude,
          longitude: a.longitude,
        }) -
        calculateDistance(location, {
          latitude: b.latitude,
          longitude: b.longitude,
        })
    )
    .slice(0, 3);

  const assignedDriver = nearestDrivers[0];

  const sosRequest = await SOS.create({
    userId: user._id,
    location,
    assignedDriver: assignedDriver._id,
    status: "assigned",
  });

  sendNotification(assignedDriver._id, {
    title: "SOS Alert",
    message: `User ${user.fullName} needs assistance at latitude: ${location.latitude}, longitude: ${location.longitude}`,
    location,
  });

  return { sosRequest, assignedDriver };
};

const getDistanceTime = async (origin, destination) => {
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(googleMapsUrl);

  if (response.data.status !== "OK") {
    throw new Error("Failed to fetch distance and time from Google Maps API");
  }

  const route = response.data.routes[0];
  const distance = route.legs[0].distance.text;
  const duration = route.legs[0].duration.text;

  return { distance, duration };
};

const generateAccessAndRefreshTokens = async (driver) => {
  try {
    const accessToken = driver.generateAccessToken();
    const refreshToken = driver.generateRefreshToken();

    // Save refresh token to driver document
    driver.refreshToken = refreshToken;
    await driver.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError(500, "Error generating authentication tokens");
  }
};

export {
  createAmbulanceDriver,
  loginAmbulanceDriver,
  getAllAmbulanceDrivers,
  getAmbulanceDriverById,
  updateAmbulanceDriver,
  deleteAmbulanceDriver,
  updateDriverShift,
  addDriverRating,
  rotateDriverShifts,
  receiveSOSNotification,
  handleSOSRequest,
  fetchHospitalsFromGoogleMaps,
  findDriversInRange,
  assignDriverAndNotify,
  getDistanceTime,
  updateDriverLocation, // Export the new function
  handleRerouting,
  generateAccessAndRefreshTokens,
};
