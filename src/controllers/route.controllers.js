import { getDirections, findNearestHospital } from "../utils/googleMaps.js";
import Route from "../models/route.model.js";
import Hospital from "../models/hospital.models.js";
import { ApiError } from "../utils/ApiError.js";

const getRoutes = (req, res) => {
  res.status(200).json({ message: "Route controller is under construction." });
};

// Calculate distance between two locations
const calculateDistance = (location1, location2) => {
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
  try {
    // Get nearest hospitals within 10km radius
    const nearbyHospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          },
          $maxDistance: 10000, // 10km radius
        },
      },
    }).limit(3); // Get top 3 nearest hospitals

    let bestRoute = null;
    let selectedHospital = null;
    let lowestTrafficScore = Infinity;

    // Check routes to each hospital
    for (const hospital of nearbyHospitals) {
      // Get route from patient to hospital
      const patientToHospital = await getDirections(location, {
        latitude: hospital.location.latitude,
        longitude: hospital.location.longitude,
      });

      // Calculate traffic score
      const trafficScore = patientToHospital.legs[0].steps.reduce(
        (score, step) => {
          const stepTraffic = step.traffic || "low";
          const trafficWeight = {
            low: 1,
            moderate: 2,
            high: 3,
            severe: 4,
          };
          return score + trafficWeight[stepTraffic];
        },
        0
      );

      // If this route has less traffic, update best route
      if (trafficScore < lowestTrafficScore) {
        lowestTrafficScore = trafficScore;
        bestRoute = patientToHospital;
        selectedHospital = hospital;
      }
    }

    // Get route from ambulance to patient
    const ambulanceToPatient = await getDirections(
      {
        latitude: assignedDriver.latitude,
        longitude: assignedDriver.longitude,
      },
      location
    );

    // Create detailed route object
    const route = new Route({
      startPoint: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
        address: bestRoute.legs[0].start_address,
      },
      endPoint: {
        type: "Point",
        coordinates: [
          selectedHospital.location.longitude,
          selectedHospital.location.latitude,
        ],
        address: bestRoute.legs[0].end_address,
      },
      hospitalId: selectedHospital._id,
      driverId: assignedDriver._id,
      waypoints: bestRoute.legs[0].steps.map((step) => ({
        location: {
          type: "Point",
          coordinates: [step.start_location.lng, step.start_location.lat],
        },
        instruction: step.html_instructions,
        distance: step.distance.text,
        duration: step.duration.text,
        traffic: step.traffic || "moderate",
      })),
      alternateRoutes: nearbyHospitals
        .filter((h) => h._id !== selectedHospital._id)
        .map((h) => ({
          hospitalId: h._id,
          hospitalName: h.name,
          estimatedTime: calculateETA(location, h.location),
          traffic: "moderate", // You can fetch actual traffic data here
        })),
      estimatedTime: bestRoute.legs[0].duration.text,
      totalDistance: bestRoute.legs[0].distance.text,
      trafficSeverity: lowestTrafficScore > 10 ? "high" : "moderate",
      status: "active",
    });

    await route.save();

    return {
      ambulanceToPatient,
      patientToHospital: bestRoute,
      selectedHospital: {
        id: selectedHospital._id,
        name: selectedHospital.name,
        location: selectedHospital.location,
        contact: selectedHospital.contact,
      },
      alternateRoutes: route.alternateRoutes,
      routeId: route._id,
      trafficSeverity: route.trafficSeverity,
      navigationLink: `https://www.google.com/maps/dir/${location.latitude},${location.longitude}/${selectedHospital.location.latitude},${selectedHospital.location.longitude}`,
    };
  } catch (error) {
    console.error("Route generation error:", error);
    throw new ApiError(500, "Failed to generate route", error);
  }
};

export { getRoutes, generatePathData, calculateDistance };
