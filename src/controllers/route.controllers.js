import { getDirections, findNearestHospital } from "../utils/googleMaps.js";
import Route from "../models/route.model.js";

const getRoutes = (req, res) => {
  res.status(200).json({ message: "Route controller is under construction." });
};

// Calculate distance between two locations
const calculateDistance = (location1, location2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const lat1 = toRadians(location1.latitude);
  const lon1 = toRadians(location1.longitude);
  const lat2 = toRadians(location2.latitude);
  const lon2 = toRadians(location2.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1; // Fixed variable name

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return distance;
};

// Generate a path between two points
const generatePath = (startPoint, endPoint) => {
  const path = {
    start: startPoint,
    end: endPoint,
    waypoints: [
      { location: "Waypoint 1", traffic: "moderate" },
      { location: "Waypoint 2", traffic: "low" },
    ],
    estimatedTime: "15 mins",
  };
  return path;
};

const generatePathData = async (assignedDriver, location) => {
  const ambulanceToPatient = await getDirections(
    {
      latitude: assignedDriver.latitude,
      longitude: assignedDriver.longitude,
    },
    location
  );

  let nearestHospital;
  try {
    nearestHospital = await findNearestHospital(location);
  } catch (error) {
    console.error(
      `Error finding nearest hospital for SOS request at location: (${location.latitude}, ${location.longitude})`,
      error.message
    );
    throw new ApiError(404, "No nearby hospitals found for the SOS request");
  }

  const patientToHospital = await getDirections(location, {
    latitude: nearestHospital.location.lat,
    longitude: nearestHospital.location.lng,
  });

  // Save route data to MongoDB
  const route = new Route({
    startPoint: location,
    endPoint: nearestHospital.location,
    waypoints: patientToHospital.legs[0].steps.map((step) => ({
      latitude: step.start_location.lat,
      longitude: step.start_location.lng,
      traffic: "moderate", // Placeholder, replace with actual traffic data
    })),
    estimatedTime: patientToHospital.legs[0].duration.text,
  });
  await route.save();

  return {
    ambulanceToPatient,
    patientToHospital,
    nearestHospital,
  };
};

export { getRoutes, calculateDistance, generatePath, generatePathData };
