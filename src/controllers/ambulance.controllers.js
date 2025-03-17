import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Ambulance from "../models/ambulance.model.js";

// Register a new ambulance
const registerAmbulance = asyncHandler(async (req, res) => {
  // Extract required fields directly from request body
  // console.log(req.body);
  const {
    driverName,
    contactNumber,
    location,
    vehicleNumber,
    vehicleRegistrationNumber,
    pollutionDocument,
    insuranceData,
    vehicleModelNumber,
    fitnessCertificate,
    driverLicense,
    permitDocument,
    roadTaxReceipt,
    otp,
  } = req.body;
  // console.log(req.body);

  // Check for missing fields
  if (
    !driverName ||
    !contactNumber ||
    !location ||
    !vehicleNumber ||
    !vehicleRegistrationNumber ||
    !pollutionDocument ||
    !insuranceData ||
    !vehicleModelNumber ||
    !fitnessCertificate ||
    !driverLicense ||
    !permitDocument ||
    !roadTaxReceipt
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ vehicleNumber }] });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // have to aggrigate ambulance driver with ambulance

  // await verifyOTP(vehicleNumber, otp);
  // Create ambulance entry in DB
  const ambulance = await Ambulance.create({
    driverName,
    contactNumber,
    location,
    vehicleNumber,
    vehicleRegistrationNumber,
    pollutionDocument,
    insuranceData,
    vehicleModelNumber,
    fitnessCertificate,
    driverLicense,
    permitDocument,
    roadTaxReceipt,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, ambulance, "Ambulance registered successfully"));
});

// Update ambulance details
const updateAmbulance = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findByIdAndUpdate(
    req.params.ambulanceId,
    req.body,
    { new: true }
  );

  if (!ambulance) throw new ApiError(404, "Ambulance not found");

  return res
    .status(200)
    .json(new ApiResponse(200, ambulance, "Ambulance updated successfully"));
});

// Fetch ambulances (all or filtered)
const getAmbulances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, available, location } = req.query;

  let filter = {};
  if (available !== undefined) filter.available = available === "true";
  if (location) filter.location = { $regex: location, $options: "i" };

  const ambulances = await Ambulance.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const totalCount = await Ambulance.countDocuments(filter);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ambulances, totalCount, totalPages: Math.ceil(totalCount / limit) },
        "Ambulances fetched successfully"
      )
    );
});

// Fetch ambulance by ID (includes live location)
const getAmbulanceById = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findById(req.params.ambulanceId).populate(
    "currentDriver hospital"
  );

  if (!ambulance) throw new ApiError(404, "Ambulance not found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, ambulance, "Ambulance details fetched successfully")
    );
});

// Fetch live location of an ambulance
const getLiveAmbulanceLocation = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findById(req.params.ambulanceId);
  if (!ambulance) throw new ApiError(404, "Ambulance not found");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        ambulance.location,
        "Live location fetched successfully"
      )
    );
});

// Fetch nearest available ambulances
const getNearestAmbulances = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body; // Extract from body, not query

    // Validate latitude and longitude
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const userLocation = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };

    // Default radius if not provided (e.g., 5 km)
    const searchRadius = radius ? parseInt(radius) : 5000;

    // Find nearest ambulances
    const ambulances = await Ambulance.find({
      location: {
        $near: {
          $geometry: userLocation,
          $maxDistance: searchRadius, // Use provided radius
        },
      },
      available: true,
    });

    res.status(200).json(ambulances);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update ambulance live location
const updateAmbulanceLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude)
    throw new ApiError(400, "Latitude and longitude are required");

  const ambulance = await Ambulance.findByIdAndUpdate(
    req.params.ambulanceId,
    { "location.coordinates": [longitude, latitude] },
    { new: true }
  );

  if (!ambulance) throw new ApiError(404, "Ambulance not found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, ambulance, "Ambulance location updated successfully")
    );
});

// Delete an ambulance
const deleteAmbulance = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findByIdAndDelete(req.params.ambulanceId);
  if (!ambulance) throw new ApiError(404, "Ambulance not found");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ambulanceId: req.params.ambulanceId },
        "Ambulance deleted successfully"
      )
    );
});

export {
  registerAmbulance,
  updateAmbulance,
  getAmbulances,
  getAmbulanceById,
  getLiveAmbulanceLocation,
  getNearestAmbulances,
  updateAmbulanceLocation,
  deleteAmbulance,
};
