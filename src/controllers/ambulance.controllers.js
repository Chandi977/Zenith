import Ambulance from "../models/ambulance.model.js";
import AmbulanceDriver from "../models/ambulanceDriver.model.js";
import SOS from "../models/sos.model.js";
import { sendNotification } from "../utils/sendNotification.js";
import { calculateDistance, findNearestHospital } from "../utils/googleMaps.js";

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

    const ambulances = await Ambulance.find({
      latitude: { $gte: latitude - 0.05, $lte: latitude + 0.05 },
      longitude: { $gte: longitude - 0.05, $lte: longitude + 0.05 },
    });

    if (ambulances.length === 0) {
      return res
        .status(404)
        .json({ message: "No available ambulances nearby." });
    }

    res.status(200).json(ambulances);
  } catch (error) {
    console.error("Error finding nearest ambulances:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLiveAmbulanceLocation = async (req, res) => {
  try {
    const { ambulanceId } = req.params;

    const ambulance =
      await Ambulance.findById(ambulanceId).select("latitude longitude");

    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    res.status(200).json({
      latitude: ambulance.latitude,
      longitude: ambulance.longitude,
    });
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
    driver.available = false;
    driver.ambulance = ambulance._id;
    await driver.save();

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

const assignDriverAndNotify = async (userId, location, driversInRange) => {
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
    userId,
    location,
    assignedDriver: assignedDriver._id,
    status: "assigned",
  });

  sendNotification(assignedDriver._id, {
    title: "SOS Alert",
    message: `User needs assistance at latitude: ${location.latitude}, longitude: ${location.longitude}`,
    location,
  });

  return { sosRequest, assignedDriver };
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
  assignDriverAndNotify,
};
