// Importing the necessary modules
import express from "express"; // Express is a web framework for Node.js
import {
  createAmbulanceDriver, // Import the controller for creating an ambulance driver
  getAllAmbulanceDrivers, // Import the controller for retrieving all ambulance drivers
  getAmbulanceDriverById, // Import the controller for retrieving a single ambulance driver by ID
  updateAmbulanceDriver, // Import the controller for updating an ambulance driver's details
  deleteAmbulanceDriver, // Import the controller for deleting an ambulance driver
  updateDriverShift, // Import the controller for updating the driver's shift
  addDriverRating, // Import the controller for adding a rating to a driver
} from "../controllers/ambulanceDriver.controller.js"; // Import the controllers from the ambulance driver controller file

// Creating a new router instance using express.Router()
const router = express.Router();

// Defining the routes for ambulance driver-related operations with descriptive route names

// Route to register a new ambulance driver
router.post("/registerAmbulanceDriver", createAmbulanceDriver);

// Route to get the list of all ambulance drivers
router.get("/getAllAmbulanceDrivers", getAllAmbulanceDrivers);

// Route to get details of a single ambulance driver by their ID
router.get("/getAmbulanceDriver/:id", getAmbulanceDriverById);

// Route to update details of an ambulance driver by their ID
router.put("/updateAmbulanceDriver/:id", updateAmbulanceDriver);

// Route to delete an ambulance driver by their ID
router.delete("/deleteAmbulanceDriver/:id", deleteAmbulanceDriver);

// Route to update the shift of a specific ambulance driver by their ID
router.put("/updateDriverShift/:id", updateDriverShift);

// Route to add a rating for a specific ambulance driver by their ID
router.post("/addDriverRating/:id", addDriverRating);

// Export the router so it can be used in other parts of the application
export default router;
