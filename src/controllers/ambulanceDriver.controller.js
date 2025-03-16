import { validationResult } from "express-validator";
import AmbulanceDriver from "../models/ambulanceDriver.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Ensure this is the correct import
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing

const createAmbulanceDriver = async (req, res) => {
  try {
    // Validate request body
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
      ambulance,
      assignedShift,
      email, // Add email if needed
      password, // Add password
    } = req.body;

    if (
      !driverName ||
      !contactNumber ||
      !age ||
      !drivingExperience ||
      !govtIdNumber ||
      !ambulance ||
      !assignedShift ||
      !email ||
      !password || // Ensure password is provided
      available === undefined
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    // 🔹 **Check if the driver already exists**
    const existingDriver = await AmbulanceDriver.findOne({
      $or: [
        { contactNumber },
        { govtIdNumber },
        { email: email || null }, // Check email if provided
      ],
    });

    if (existingDriver) {
      return res.status(400).json({
        message: "Driver already registered with the provided details.",
      });
    }

    // 🔹 **Generate a Unique `userId`**
    const userId = `DR${Date.now()}`; // Example format: DR1712774567890

    // 🔹 **Hash the password for security**
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 **Check if all files exist**
    const files = req.files;
    if (!files?.driverLicense || !files?.govtIdProof || !files?.driverPhoto) {
      return res
        .status(400)
        .json({ message: "All required documents must be uploaded" });
    }

    // 🔹 **Upload documents to Cloudinary**
    const uploadPromises = [
      uploadOnCloudinary(files.driverLicense[0].buffer, "driverLicense"),
      uploadOnCloudinary(files.govtIdProof[0].buffer, "govtIdProof"),
      uploadOnCloudinary(files.driverPhoto[0].buffer, "driverPhoto"),
    ];

    const [driverLicense, govtIdProof, driverPhoto] =
      await Promise.all(uploadPromises);

    // 🔹 **Create and Save New Driver**
    const newDriver = new AmbulanceDriver({
      userId,
      driverName,
      contactNumber,
      email, // Include email if required
      password: hashedPassword, // Store hashed password
      driverLicense,
      age,
      rating,
      drivingExperience,
      govtIdProof,
      govtIdNumber,
      driverPhoto,
      available,
      ambulance,
      assignedShift,
    });

    await newDriver.save();

    return res.status(201).json({
      message: "Ambulance driver created successfully",
      driver: {
        userId,
        driverName,
        contactNumber,
        email,
        available,
        ambulance,
        assignedShift,
      }, // Send only non-sensitive info
    });
  } catch (error) {
    console.error("Driver Upload Error:", error);
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

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // You can generate a JWT token here for authentication (optional)
    // const token = jwt.sign({ userId: driver._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

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
        // Include token if needed
        // token,
      },
    });
  } catch (error) {
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
    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 0 and 5",
      });
    }

    // Add the rating to the userRatings array
    driver.userRatings.push(rating);
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
};
