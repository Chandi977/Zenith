import { getDirections, findNearestHospital } from "../utils/googleMaps.js";
import Route from "../models/route.model.js";
import Hospital from "../models/hospital.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
const generatePath = (startPoint, endPoint) => {
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

const createRoute = asyncHandler(async (req, res) => {
  const { startPoint, endPoint, hospitalId, driverId } = req.body;

  if (!startPoint || !endPoint || !hospitalId || !driverId) {
    throw new ApiError(400, "Missing required fields");
  }

  const route = await Route.create({
    startPoint: {
      type: "Point",
      coordinates: [startPoint.longitude, startPoint.latitude],
      address: startPoint.address,
    },
    endPoint: {
      type: "Point",
      coordinates: [endPoint.longitude, endPoint.latitude],
      address: endPoint.address,
    },
    hospitalId,
    driverId,
    status: "active",
  });

  return res.status(201).json({
    success: true,
    route,
  });
});

const getRouteById = asyncHandler(async (req, res) => {
  const { routeId } = req.params;

  const route = await Route.findById(routeId)
    .populate("hospitalId", "name location contact")
    .populate("driverId", "driverName contactNumber");

  if (!route) {
    throw new ApiError(404, "Route not found");
  }

  return res.status(200).json({
    success: true,
    route,
  });
});

const getAllActiveRoutes = asyncHandler(async (req, res) => {
  const routes = await Route.find({ status: "active" })
    .populate("hospitalId", "name location contact")
    .populate("driverId", "driverName contactNumber");

  return res.status(200).json({
    success: true,
    routes,
  });
});

const updateRouteStatus = asyncHandler(async (req, res) => {
  const { routeId } = req.params;
  const { status, sosRequestId } = req.body;

  const route = await Route.findOne({ routeId, sosRequestId });
  if (!route) {
    throw new ApiError(404, "Route not found");
  }

  // Validate status transition
  const validTransitions = {
    pending: ["active"],
    active: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[route.status].includes(status)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${route.status} to ${status}`
    );
  }

  route.status = status;
  await route.save();

  return res.status(200).json({
    success: true,
    data: route,
  });
});

const createSOSRoutes = asyncHandler(async (req, res) => {
  try {
    const {
      sosRequestId,
      userId,
      driverId,
      hospitalId,
      patientLocation,
      driverLocation,
      hospitalLocation,
    } = req.body;

    // Create driver-to-patient route
    const driverToPatientRoute = await Route.create({
      sosRequestId,
      userId,
      driverId,
      hospitalId,
      startPoint: {
        type: "Point",
        coordinates: [driverLocation.longitude, driverLocation.latitude],
      },
      endPoint: {
        type: "Point",
        coordinates: [patientLocation.longitude, patientLocation.latitude],
      },
    });

    // Create patient-to-hospital route
    const patientToHospitalRoute = await Route.create({
      sosRequestId,
      userId,
      driverId,
      hospitalId,
      startPoint: {
        type: "Point",
        coordinates: [patientLocation.longitude, patientLocation.latitude],
      },
      endPoint: {
        type: "Point",
        coordinates: [hospitalLocation.longitude, hospitalLocation.latitude],
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        driverToPatient: driverToPatientRoute,
        patientToHospital: patientToHospitalRoute,
      },
    });
  } catch (error) {
    throw new ApiError(500, "Error creating SOS routes", error);
  }
});

const getSOSRoutes = asyncHandler(async (req, res) => {
  const { sosRequestId } = req.params;

  if (!sosRequestId) {
    throw new ApiError(400, "SOS Request ID is required");
  }

  const routes = await Route.find({ sosRequestId })
    .populate("hospitalId", "name location contact")
    .populate("driverId", "driverName contactNumber")
    .sort("sequence");

  if (!routes || routes.length === 0) {
    throw new ApiError(404, "No routes found for this SOS request");
  }

  return res.status(200).json({
    success: true,
    data: routes,
  });
});

// Update the exports to include getSOSRoutes
export {
  getRoutes,
  generatePathData,
  calculateDistance,
  createRoute,
  getRouteById,
  updateRouteStatus,
  getAllActiveRoutes,
  createSOSRoutes,
  getSOSRoutes, // Add this line
};
