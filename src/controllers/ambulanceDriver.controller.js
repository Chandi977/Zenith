import AmbulanceDriver from "../models/ambulanceDriver.model.js";

// Create a new ambulance driver
const createAmbulanceDriver = async (req, res) => {
  try {
    const {
      driverName,
      contactNumber,
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
    } = req.body;

    const newDriver = new AmbulanceDriver({
      driverName,
      contactNumber,
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
    res.status(201).json({
      message: "Ambulance driver created successfully",
      driver: newDriver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating ambulance driver",
      error: error.message,
    });
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
  getAllAmbulanceDrivers,
  getAmbulanceDriverById,
  updateAmbulanceDriver,
  deleteAmbulanceDriver,
  updateDriverShift,
  addDriverRating,
};
