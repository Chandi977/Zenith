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
import { verifyOTPProgrammatically } from "./otp.controller.js"; // Import verifyOTPProgrammatically
import { getAddressCoordinates } from "../utils/googleMaps.js";

dotenv.config();

const sosEventEmitter = new EventEmitter(); // Create an event emitter instance

// Create a new ambulance driver
const createAmbulanceDriver = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      driverName,
      contactNumber,
      age,
      rating,
      drivingExperience,
      govtIdNumber,
      available,
      assignedShift,
      email,
      password,
      otp,
      longitude,
      latitude,
      hospital, // Hospital name
      ...otherFields
    } = req.body;

    // Normalize hospital name for consistent matching
    const normalizedHospital =
      typeof hospital === "string" ? hospital.trim().toLowerCase() : hospital;

    // Log the normalized hospital value for debugging
    console.log("Normalized hospital value from request:", normalizedHospital);

    // Check required fields dynamically
    const requiredFields = [
      "driverName",
      "contactNumber",
      "age",
      "drivingExperience",
      "govtIdNumber",
      "assignedShift",
      "email",
      "password",
      "longitude",
      "latitude",
      "otp",
      "hospital",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    if (available == null) {
      return res
        .status(400)
        .json({ message: "Availability status is required" });
    }

    // Check if driver already exists
    const existingDriver = await AmbulanceDriver.findOne({
      $or: [{ contactNumber }, { govtIdNumber }, { email }],
    });

    if (existingDriver) {
      return res.status(400).json({
        message: "Driver already registered with the provided details.",
      });
    }

    // Fetch hospital data using the utility function
    const hospitals = await getAddressCoordinates(hospital);

    // Find the hospital by normalized name only
    const hospitalExists = hospitals.find((h) =>
      h.name
        .replace(/[,]/g, "")
        .toLowerCase()
        .includes(normalizedHospital.replace(/[,]/g, "").toLowerCase())
    );

    if (!hospitalExists) {
      console.error(`Hospital not found for query: ${normalizedHospital}`);
      return res.status(404).json({
        message: `Hospital not found. Please ensure the hospital name is correct. Provided value: ${hospital}`,
        suggestions: [
          "Verify that the hospital name is correct.",
          "Ensure the hospital exists in the specified location.",
        ],
      });
    }

    // Check if the hospital exists in the database
    let hospitalDocument = await Hospital.findOne({
      placeId: hospitalExists.id,
    });
    if (!hospitalDocument) {
      // If not, create a new hospital document
      hospitalDocument = await Hospital.create({
        name: hospitalExists.name,
        address: hospitalExists.address,
        phone: "Not available", // Placeholder, as phone is not provided by Google Maps API
        email: `${hospitalExists.name.replace(/\s+/g, "").toLowerCase()}@example.com`, // Placeholder email
        placeId: hospitalExists.id,
        location: {
          latitude: hospitalExists.location.lat,
          longitude: hospitalExists.location.lng,
        },
        rating: hospitalExists.rating,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const files = req.files;
    if (!files?.driverLicense || !files?.govtIdProof || !files?.driverPhoto) {
      return res
        .status(400)
        .json({ message: "All required documents must be uploaded" });
    }

    // Upload documents to Cloudinary
    const uploadPromises = [
      uploadOnCloudinary(files.driverLicense[0].buffer, "driverLicense"),
      uploadOnCloudinary(files.govtIdProof[0].buffer, "govtIdProof"),
      uploadOnCloudinary(files.driverPhoto[0].buffer, "driverPhoto"),
    ];

    const [driverLicense, govtIdProof, driverPhoto] =
      await Promise.all(uploadPromises);

    await verifyOTPProgrammatically(email, otp);

    // Create new driver instance
    const newDriver = new AmbulanceDriver({
      userId: `DR${Date.now()}`,
      driverName,
      contactNumber,
      email,
      password: hashedPassword,
      driverLicense,
      age,
      rating,
      drivingExperience,
      govtIdProof,
      govtIdNumber,
      driverPhoto,
      available,
      assignedShift,
      latitude,
      longitude, // Save driver's location
      hospital: hospitalDocument._id, // Use the ObjectId of the hospital document
    });

    await newDriver.save();

    return res.status(201).json({
      message: "Ambulance driver created successfully",
      driver: {
        ...newDriver.toObject(),
        hospital: hospitalDocument.name, // Include hospital name in response
      },
    });
  } catch (error) {
    console.error("Driver Upload Error:", error.stack);
    return res.status(500).json({
      message: "Error creating ambulance driver",
      error: error.message,
    });
  }
};

// Login function (with OTP verification)
const loginAmbulanceDriver = async (req, res) => {
  try {
    const { email, password, otp, location } = req.body;
    console.log("Login request received:", req.body);

    if (!email || !password || !otp) {
      return res
        .status(400)
        .json({ message: "Email, password, and OTP are required" });
    }

    const driver = await AmbulanceDriver.findOne({ email });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Verify OTP
    await verifyOTPProgrammatically(email, otp);

    // Check password
    const isMatch = await driver.isPasswordCorrect(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (location && location.latitude && location.longitude) {
      driver.location = location; // Update driver's location on login
      await driver.save();
    }

    // Generate JWT token for authentication
    const token = jwt.sign({ userId: driver._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      driver: {
        userId: driver.userId,
        driverName: driver.driverName,
        contactNumber: driver.contactNumber,
        email: driver.email,
        available: driver.available,
        ambulance: driver.ambulance,
        assignedShift: driver.assignedShift,
        location: driver.location,
        token,
      },
    });
  } catch (error) {
    console.error("Error in login process: ", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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
};
