import express from "express";
import {
  generatePath,
  calculateDistance,
} from "../controllers/route.controllers.js";
import {
  assignAmbulanceDriver,
  handleRerouting,
} from "../controllers/ambulanceDriver.controller.js";

const router = express.Router();

// Placeholder route for routes
router.get("/", (req, res) => {
  res.status(200).json({ message: "Route management is under construction." });
});

// Route to generate path JSON object
router.post("/generate-path", (req, res) => {
  const { startPoint, endPoint } = req.body;
  const pathData = generatePath(startPoint, endPoint);
  res.status(200).json(pathData);
});

// Route to assign an ambulance driver
router.post("/assign-driver", assignAmbulanceDriver);

// Route for AI-driven rerouting
router.post("/reroute", handleRerouting);

export default router;
