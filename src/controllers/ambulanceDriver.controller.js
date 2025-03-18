import { validationResult } from "express-validator";
import AmbulanceDriver from "../models/ambulanceDriver.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Ensure this is the correct import
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing
import jwt from "jsonwebtoken";
import cron from "node-cron";

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
    } = req.body;

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
    });

    await newDriver.save();

    return res.status(201).json({
      message: "Ambulance driver created successfully",
      driver: {
        userId: newDriver.userId,
        driverName,
        contactNumber,
        email,
        available,
        assignedShift,
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

// Login function (without OTP)
const loginAmbulanceDriver = async (req, res) => {
  try {
    const { email, password } = req.body;
    const driver = await AmbulanceDriver.findOne({ email });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Use the correct method name for password comparison
    const isMatch = await driver.isPasswordCorrect(password); // Fix method name
    console.log("Password comparison result: ", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
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
        token, // Include token in response
      },
    });
  } catch (error) {
    console.error("Error in login process: ", error); // Log any error for debugging
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
    const driver = await AmbulanceDriver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }
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
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }
    res.status(200).json({
      message: "Ambulance driver deleted successfully",
    });
  } catch (error) {
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
cron.schedule("0 0 * * 0", rotateDriverShifts, {
  timezone: "Asia/Kolkata", // Adjust based on your region
});

// Add a rating to a driver
const addDriverRating = async (req, res) => {
  try {
    const driver = await AmbulanceDriver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        message: "Ambulance driver not found",
      });
    }

    const { rating } = req.body;
    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be a number between 0 and 5",
      });
    }

    // Add the new rating to the userRatings array
    driver.userRatings.push(rating);

    // Calculate the new average rating
    const totalRatings = driver.userRatings.length;
    const sumRatings = driver.userRatings.reduce((sum, r) => sum + r, 0);
    driver.averageRating = (sumRatings / totalRatings).toFixed(1); // Round to 1 decimal place

    // Save the updated driver data
    await driver.save();

    res.status(200).json({
      message: "Rating added successfully",
      averageRating: driver.averageRating,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding rating to driver",
      error: error.message,
    });
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
};
