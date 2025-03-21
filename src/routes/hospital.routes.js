import express from "express";
import { getHospitals } from "../controllers/hospital.controllers.js";

const router = express.Router();

/**
 * @route   GET /api/v1/hospital/nearby
 * @desc    Fetch nearby hospitals using Google Maps API
 * @access  Public
 */
router.get("/nearby", getHospitals);

export default router;
