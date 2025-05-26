import express from "express";
import {
  getRoutes,
  generatePathData,
  calculateDistance,
  createRoute,
  getRouteById,
  updateRouteStatus,
  getAllActiveRoutes,
  createSOSRoutes,
  getSOSRoutes,
} from "../controllers/route.controllers.js";
import { verifyJWT as auth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Placeholder route for routes
router.get("/", (req, res) => {
  res.status(200).json({ message: "Route management is under construction." });
});

// Route to generate path JSON object
router.post("/generate-path", auth, generatePathData);

// Route to create a new route
router.post("/create", auth, createRoute);

// Route to get all active routes
router.get("/active", auth, getAllActiveRoutes);

// Route to get a specific route by ID
router.get("/:routeId", auth, getRouteById);

// Route to update the status of a route
router.patch("/:routeId/status", auth, updateRouteStatus);

// Route to create SOS routes
router.post("/sos", auth, createSOSRoutes);

// Route to get SOS routes by request ID
router.get("/sos/:sosRequestId", auth, getSOSRoutes);

export default router;
