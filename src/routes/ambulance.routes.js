import express from "express";
import mongoose from "mongoose";
import {
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
} from "../controllers/ambulance.controllers.js";

const router = express.Router();

// Register a new ambulance
router.post("/register", registerAmbulance);

// Get nearest available ambulances (MOVE THIS BEFORE /:ambulanceId TO AVOID CONFLICT)
router.get("/nearest", getNearestAmbulances);

// Get all ambulances with filters
router.get("/", getAllAmbulances);

// Get live location of an ambulance
router.get("/:ambulanceId/location", getLiveAmbulanceLocation);

// Update ambulance details
router.put("/:ambulanceId", updateAmbulance);

// Get ambulance by ID (VALIDATE OBJECTID)
router.get("/:ambulanceId", async (req, res, next) => {
  const { ambulanceId } = req.params;

  // Validate ObjectId before querying MongoDB
  if (!mongoose.Types.ObjectId.isValid(ambulanceId)) {
    return res.status(400).json({ message: "Invalid Ambulance ID" });
  }

  // Call original controller function
  getAmbulanceById(req, res, next);
});

// Update ambulance status
router.patch("/:ambulanceId/status", updateAmbulanceStatus);

// Delete an ambulance
router.delete("/:ambulanceId", deleteAmbulance);

// Assign a new driver to an ambulance
router.post("/assign-driver", assignNewDriver);

// Get ambulances assigned to a specific driver
router.get("/driver/:driverId", getAmbulancesByDriver);

// Get ambulances by area
router.post("/area", getAmbulancesByArea);

export default router;
