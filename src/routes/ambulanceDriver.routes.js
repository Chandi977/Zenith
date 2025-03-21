import express from "express";
import multer from "multer";
import {
  createAmbulanceDriver,
  loginAmbulanceDriver,
  getAllAmbulanceDrivers,
  getAmbulanceDriverById,
  updateAmbulanceDriver,
  deleteAmbulanceDriver,
  updateDriverShift,
  addDriverRating,
  receiveSOSNotification,
  handleSOSRequest,
  updateDriverLocation,
} from "../controllers/ambulanceDriver.controller.js";

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

// Routes
router.post(
  "/register",
  upload.fields([
    { name: "driverLicense", maxCount: 1 },
    { name: "govtIdProof", maxCount: 1 },
    { name: "driverPhoto", maxCount: 1 },
  ]),
  createAmbulanceDriver // Ensure hospital is included in the request body
);
router.post("/login", loginAmbulanceDriver);
router.get("/ambulances", getAllAmbulanceDrivers);
router.get("/ambulanceById/:id", getAmbulanceDriverById);
router.put("/updateDriverData/:id", updateAmbulanceDriver);
router.delete("/:id", deleteAmbulanceDriver);
router.patch("/:id/shift", updateDriverShift);
router.post("/:id/rating", addDriverRating);
router.post("/sos/receive", receiveSOSNotification);
router.post("/sos/handle", handleSOSRequest);
router.patch("/:driverId/location", updateDriverLocation);

export default router;
