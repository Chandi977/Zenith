import Ambulance from "../models/ambulance.model.js";
import AmbulanceDriver from "../models/ambulanceDriver.model.js";

const registerAmbulance = async (req, res) => {
  try {
    const {
      vehicleNumber,
      rcNumber,
      latitude,
      longitude,
      ambulanceType,
      pollutionCertificateValidTill,
      fitnessCertificateValidTill,
      insuranceValidTill,
      permitValidTill,
      serviceStartDate,
      lastServiceDate,
      emergencyContact,
      oxygenCylinderAvailable,
      ventilatorAvailable,
      stretcherAvailable,
    } = req.body;

    // Step 1: Find an available driver
    const availableDriver = await AmbulanceDriver.aggregate([
      { $match: { available: true, ambulance: null } },
      { $sample: { size: 1 } },
    ]);

    if (availableDriver.length === 0) {
      return res
        .status(400)
        .json({ message: "No available drivers at the moment." });
    }

    const driver = availableDriver[0];

    // Step 2: Create Ambulance
    const ambulance = new Ambulance({
      vehicleNumber,
      rcNumber,
      location: { type: "Point", coordinates: [longitude, latitude] },
      driver: driver._id,
      ambulanceType,
      pollutionCertificateValidTill,
      fitnessCertificateValidTill,
      insuranceValidTill,
      permitValidTill,
      serviceStartDate,
      lastServiceDate,
      emergencyContact,
      oxygenCylinderAvailable,
      ventilatorAvailable,
      stretcherAvailable,
      status: "Available",
    });

    await ambulance.save();

    // Step 3: Update Driver to reflect assignment
    await AmbulanceDriver.findByIdAndUpdate(driver._id, {
      available: false,
      ambulance: ambulance._id,
    });

    res.status(201).json({
      message: "Ambulance registered successfully with an assigned driver.",
      ambulance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNearestAmbulances = async (req, res) => {
  try {
    const { latitude, longitude } = req.body; // Get user coordinates from request

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and Longitude are required." });
    }

    const nearestAmbulances = await Ambulance.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: 5000, // Adjust max search radius (in meters)
          spherical: true,
          key: "location", // Make sure 'location' is indexed as 2dsphere in your schema
        },
      },
    ]);

    if (nearestAmbulances.length === 0) {
      return res
        .status(404)
        .json({ message: "No available ambulances nearby." });
    }

    res.status(200).json(nearestAmbulances);
  } catch (error) {
    console.error("Error finding nearest ambulances:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLiveAmbulanceLocation = async (req, res) => {
  try {
    const { ambulanceId } = req.params;

    const ambulance = await Ambulance.findById(ambulanceId).select("location");

    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    res.status(200).json({ location: ambulance.location });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAmbulance = async (req, res) => {
  try {
    const { ambulanceId } = req.params;
    const updates = req.body;

    const updatedAmbulance = await Ambulance.findByIdAndUpdate(
      ambulanceId,
      updates,
      { new: true }
    );

    if (!updatedAmbulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    res
      .status(200)
      .json({ message: "Ambulance updated successfully", updatedAmbulance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllAmbulances = async (req, res) => {
  try {
    const {
      status,
      ambulanceType,
      oxygenCylinderAvailable,
      ventilatorAvailable,
    } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (ambulanceType) filter.ambulanceType = ambulanceType;
    if (oxygenCylinderAvailable)
      filter.oxygenCylinderAvailable = oxygenCylinderAvailable === "true";
    if (ventilatorAvailable)
      filter.ventilatorAvailable = ventilatorAvailable === "true";

    const ambulances = await Ambulance.find(filter).populate(
      "driver",
      "name contactNumber"
    );

    res.status(200).json(ambulances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAmbulanceById = async (req, res) => {
  try {
    const { ambulanceId } = req.params;

    const ambulance = await Ambulance.findById(ambulanceId).populate(
      "driver",
      "name contactNumber"
    );

    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    res.status(200).json(ambulance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAmbulanceStatus = async (req, res) => {
  try {
    const { ambulanceId } = req.params;
    const { status } = req.body;

    if (!["Available", "On Duty", "Under Maintenance"].includes(status)) {
      return res.status(400).json({ message: "Invalid status update" });
    }

    const updatedAmbulance = await Ambulance.findByIdAndUpdate(
      ambulanceId,
      { status },
      { new: true }
    );

    if (!updatedAmbulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    res.status(200).json({
      message: "Ambulance status updated successfully",
      updatedAmbulance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAmbulance = async (req, res) => {
  try {
    const { ambulanceId } = req.params;

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    // Free the assigned driver
    if (ambulance.driver) {
      await AmbulanceDriver.findByIdAndUpdate(ambulance.driver, {
        available: true,
        ambulance: null,
      });
    }

    await Ambulance.findByIdAndDelete(ambulanceId);

    res.status(200).json({ message: "Ambulance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignNewDriver = async (req, res) => {
  try {
    const { ambulanceId, driverId } = req.body;
    // console.log(ambulanceId, driverId);

    // Check if ambulance exists
    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    // Check if driver exists and is available
    const driver = await AmbulanceDriver.findById(driverId);
    if (!driver || !driver.available) {
      return res.status(400).json({ message: "Driver not available" });
    }

    // Free the current driver if assigned
    if (ambulance.driver) {
      await AmbulanceDriver.findByIdAndUpdate(ambulance.driver, {
        available: true,
        ambulance: null,
      });
    }

    // Assign the new driver
    ambulance.driver = driver._id;
    await ambulance.save();

    // Update driver status
    await AmbulanceDriver.findByIdAndUpdate(driver._id, {
      available: false,
      ambulance: ambulance._id,
    });

    res
      .status(200)
      .json({ message: "Driver assigned successfully", ambulance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAmbulancesByDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    const ambulances = await Ambulance.find({ driver: driverId }).populate(
      "driver",
      "name contactNumber"
    );

    res.status(200).json(ambulances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAmbulancesByArea = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000 } = req.body; // Default 5km radius

    const ambulances = await Ambulance.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance,
          spherical: true,
          query: { status: "Available" },
        },
      },
    ]);

    res.status(200).json(ambulances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAvailableAmbulanceCount = async (req, res) => {
  try {
    const count = await Ambulance.countDocuments({ status: "Available" });

    res.status(200).json({ availableAmbulances: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAmbulancesNeedingMaintenance = async (req, res) => {
  try {
    const today = new Date();

    const ambulances = await Ambulance.find({
      $or: [
        { fitnessCertificateValidTill: { $lte: today } },
        { insuranceValidTill: { $lte: today } },
        { pollutionCertificateValidTill: { $lte: today } },
        { permitValidTill: { $lte: today } },
      ],
    });

    res.status(200).json(ambulances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  registerAmbulance,
  getNearestAmbulances,
  getLiveAmbulanceLocation,
  updateAmbulance,
  getAllAmbulances,
  getAmbulanceById,
  updateAmbulanceStatus,
  deleteAmbulance,
  assignNewDriver,
  getAmbulancesByDriver,
  getAmbulancesByArea,
  getAvailableAmbulanceCount,
  getAmbulancesNeedingMaintenance,
};

// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import Ambulance from "../models/ambulance.model.js";
// import AmbulanceDriver from "../models/ambulanceDriver.model.js";

// // Register a new ambulance (with aggregation pipeline for driver assignment)
// const registerAmbulance = asyncHandler(async (req, res) => {
//   const {
//     location,
//     vehicleNumber,
//     vehicleRegistrationNumber,
//     vehicleModelNumber,
//     documents,
//   } = req.body;

//   if (
//     !location ||
//     !vehicleNumber ||
//     !vehicleRegistrationNumber ||
//     !vehicleModelNumber ||
//     !documents
//   ) {
//     throw new ApiError(400, "All fields are required");
//   }

//   const existingAmbulance = await Ambulance.findOne({ vehicleNumber });
//   if (existingAmbulance) {
//     throw new ApiError(409, "Ambulance already registered");
//   }

//   // Assign an available driver using an aggregation pipeline
//   const driverAssignment = await AmbulanceDriver.aggregate([
//     { $match: { available: true } },
//     { $sample: { size: 1 } }, // Randomly select one available driver
//   ]);

//   const assignedDriver =
//     driverAssignment.length > 0 ? driverAssignment[0]._id : null;

//   // Create ambulance
//   const ambulance = await Ambulance.create({
//     location,
//     vehicleNumber,
//     vehicleRegistrationNumber,
//     vehicleModelNumber,
//     documents,
//     currentDriver: assignedDriver,
//   });

//   // Mark driver as assigned (if one was found)
//   if (assignedDriver) {
//     await AmbulanceDriver.findByIdAndUpdate(assignedDriver, {
//       available: false,
//       ambulance: ambulance._id,
//     });
//   }

//   return res
//     .status(201)
//     .json(new ApiResponse(201, ambulance, "Ambulance registered successfully"));
// });

// // Update ambulance details
// const updateAmbulance = asyncHandler(async (req, res) => {
//   const ambulance = await Ambulance.findByIdAndUpdate(
//     req.params.ambulanceId,
//     req.body,
//     { new: true }
//   );

//   if (!ambulance) throw new ApiError(404, "Ambulance not found");

//   return res
//     .status(200)
//     .json(new ApiResponse(200, ambulance, "Ambulance updated successfully"));
// });

// // Fetch all ambulances with pagination and filters
// const getAmbulances = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, available, location } = req.query;

//   let filter = {};
//   if (available !== undefined) filter.available = available === "true";
//   if (location)
//     filter["location.coordinates"] = { $regex: location, $options: "i" };

//   const ambulances = await Ambulance.find(filter)
//     .skip((page - 1) * limit)
//     .limit(Number(limit));

//   const totalCount = await Ambulance.countDocuments(filter);

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         { ambulances, totalCount, totalPages: Math.ceil(totalCount / limit) },
//         "Ambulances fetched successfully"
//       )
//     );
// });

// // Fetch ambulance by ID (with driver and hospital details)
// const getAmbulanceById = asyncHandler(async (req, res) => {
//   const ambulance = await Ambulance.findById(req.params.ambulanceId).populate(
//     "currentDriver hospital"
//   );

//   if (!ambulance) throw new ApiError(404, "Ambulance not found");

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, ambulance, "Ambulance details fetched successfully")
//     );
// });

// // Fetch live location of an ambulance
// const getLiveAmbulanceLocation = asyncHandler(async (req, res) => {
//   const ambulance = await Ambulance.findById(req.params.ambulanceId);
//   if (!ambulance) throw new ApiError(404, "Ambulance not found");

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         ambulance.location,
//         "Live location fetched successfully"
//       )
//     );
// });

// // Fetch nearest available ambulances using geospatial queries
// const getNearestAmbulances = asyncHandler(async (req, res) => {
//   const { latitude, longitude, radius = 5000 } = req.body;

//   if (!latitude || !longitude)
//     throw new ApiError(400, "Latitude and longitude are required");

//   const ambulances = await Ambulance.find({
//     location: {
//       $near: {
//         $geometry: {
//           type: "Point",
//           coordinates: [parseFloat(longitude), parseFloat(latitude)],
//         },
//         $maxDistance: parseInt(radius),
//       },
//     },
//     available: true,
//   });

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         ambulances,
//         "Nearest ambulances fetched successfully"
//       )
//     );
// });

// // Update ambulance live location
// const updateAmbulanceLocation = asyncHandler(async (req, res) => {
//   const { latitude, longitude } = req.body;
//   if (!latitude || !longitude)
//     throw new ApiError(400, "Latitude and longitude are required");

//   const ambulance = await Ambulance.findByIdAndUpdate(
//     req.params.ambulanceId,
//     { "location.coordinates": [longitude, latitude] },
//     { new: true }
//   );

//   if (!ambulance) throw new ApiError(404, "Ambulance not found");

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, ambulance, "Ambulance location updated successfully")
//     );
// });

// // Delete an ambulance
// const deleteAmbulance = asyncHandler(async (req, res) => {
//   const ambulance = await Ambulance.findByIdAndDelete(req.params.ambulanceId);
//   if (!ambulance) throw new ApiError(404, "Ambulance not found");

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         { ambulanceId: req.params.ambulanceId },
//         "Ambulance deleted successfully"
//       )
//     );
// });

// export {
//   registerAmbulance,
//   updateAmbulance,
//   getAmbulances,
//   getAmbulanceById,
//   getLiveAmbulanceLocation,
//   getNearestAmbulances,
//   updateAmbulanceLocation,
//   deleteAmbulance,
// };
