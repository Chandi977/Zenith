import { getDirections } from "../utils/googleMaps.js";
import Route from "../models/route.model.js";

const getRoutes = (req, res) => {
  res.status(200).json({ message: "Route controller is under construction." });
};

// Calculate distance between two locations
export const calculateDistance = (location1, location2) => {
  try {
    // Input validation
    if (
      !location1?.latitude ||
      !location1?.longitude ||
      !location2?.latitude ||
      !location2?.longitude
    ) {
      throw new Error("Invalid location coordinates");
    }

    // Define constants
    const R = 6371; // Earth's radius in kilometers
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    // Convert coordinates to radians
    const lat1 = toRadians(location1.latitude);
    const lon1 = toRadians(location1.longitude);
    const lat2 = toRadians(location2.latitude);
    const lon2 = toRadians(location2.longitude);

    // Calculate differences
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // Calculate distance using Haversine formula
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Number(distance.toFixed(2));
  } catch (error) {
    console.error("Distance calculation error:", error);
    throw new Error("Failed to calculate distance between locations");
  }
};

// Generate a path between two points
export const generatePath = (startPoint, endPoint) => {
  // Validate inputs
  if (!startPoint || !endPoint) {
    throw new Error("Start and end points are required");
  }

  const distance = calculateDistance(startPoint, endPoint);

  return {
    distance,
    estimatedTime: Math.round(distance * 2), // Rough estimate: 2 minutes per km
    path: {
      start: startPoint,
      end: endPoint,
    },
  };
};

const generatePathData = async (assignedDriver, location) => {
  const ambulanceToPatient = await getDirections(
    {
      latitude: assignedDriver.latitude,
      longitude: assignedDriver.longitude,
    },
    location
  );

  // Removed nearestHospital logic
  const patientToHospital = await getDirections(location, {
    latitude: 0, // Placeholder latitude
    longitude: 0, // Placeholder longitude
  });

  // Save route data to MongoDB
  const route = new Route({
    startPoint: location,
    endPoint: { latitude: 0, longitude: 0 }, // Placeholder endPoint
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
    nearestHospital: { location: { lat: 0, lng: 0 } }, // Placeholder nearestHospital
  };
};

export { getRoutes, generatePathData };
