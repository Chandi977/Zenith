import express from "express";
import {
  registerAmbulance,
  updateAmbulance,
  getAmbulances,
  getAmbulanceById,
  getLiveAmbulanceLocation,
  getNearestAmbulances,
  updateAmbulanceLocation,
  deleteAmbulance,
} from "../controllers/ambulance.controllers.js";

const router = express.Router();

// Register a new ambulance
router.post("/register", registerAmbulance);

// Update ambulance details
router.put("/update/:ambulanceId", updateAmbulance);

// Get all ambulances (with optional filtering)
router.get("/all", getAmbulances);

// Get nearest available ambulances
router.get("/nearest", getNearestAmbulances);

// Get ambulance by ID
router.get("/:ambulanceId", getAmbulanceById);

// Get live location of an ambulance
router.get("/location/:ambulanceId", getLiveAmbulanceLocation);

// Update ambulance location
router.put("/update-location/:ambulanceId", updateAmbulanceLocation);

// Delete an ambulance
router.delete("/delete/:ambulanceId", deleteAmbulance);

export default router;
