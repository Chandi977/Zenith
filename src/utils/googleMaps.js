import axios from "axios";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Function to calculate distance between two locations
const calculateDistance = (location1, location2) => {
  try {
    // Validate location objects
    if (!location1 || !location2) {
      throw new Error("Both locations are required");
    }

    // Handle different location object structures
    const lat1 = Number(location1.latitude || location1.lat || 0);
    const lon1 = Number(location1.longitude || location1.lng || 0);
    const lat2 = Number(location2.latitude || location2.lat || 0);
    const lon2 = Number(location2.longitude || location2.lng || 0);

    // Validate coordinates
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      throw new Error("Invalid coordinates in location objects");
    }

    // Earth's radius in kilometers
    const R = 6371;

    // Convert coordinates to radians
    const toRad = (value) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Number(distance.toFixed(2));
  } catch (error) {
    console.error("Distance calculation error:", {
      location1,
      location2,
      error: error.message,
    });
    throw new Error("Failed to calculate distance between locations");
  }
};

// Function to calculate ETA between two locations
const calculateETA = (location1, location2, speed) => {
  const distance = calculateDistance(location1, location2); // Distance in km
  const time = distance / speed; // Time in hours
  return `${Math.round(time * 60)} minutes`; // Convert to minutes
};

// Function to generate a Google Maps link for navigation
const generateMapLink = (startLocation, endLocation) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${startLocation.latitude},${startLocation.longitude}&destination=${endLocation.latitude},${endLocation.longitude}`;
};

// Function to get directions between two locations using Google Maps API
const getDirections = async (startLocation, endLocation) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLocation.latitude},${startLocation.longitude}&destination=${endLocation.latitude},${endLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const response = await axios.get(url);
    if (response.data.status !== "OK") {
      throw new Error("Failed to fetch directions from Google Maps API");
    }
    return response.data.routes[0];
  } catch (error) {
    console.error("Error fetching directions:", error.message);
    throw error;
  }
};

// Function to fetch nearby hospitals using Google Maps API
const findNearestHospital = async (location) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=5000&type=hospital&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const response = await axios.get(url);
    if (response.data.status !== "OK") {
      throw new Error("Failed to fetch nearby hospitals from Google Maps API");
    }
    const hospitals = response.data.results.map((hospital) => ({
      name: hospital.name,
      address: hospital.vicinity,
      location: hospital.geometry.location,
      rating: hospital.rating || "Not rated",
    }));
    return hospitals[0]; // Return the nearest hospital
  } catch (error) {
    console.error("Error fetching nearby hospitals:", error.message);
    throw error;
  }
};

// Function to get address coordinates using Google Maps Geocoding API
const getAddressCoordinates = async (address) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const response = await axios.get(url);
    if (response.data.status !== "OK") {
      throw new Error("Failed to fetch coordinates from Google Maps API");
    }
    return response.data.results.map((result) => ({
      name: result.formatted_address,
      location: result.geometry.location,
    }));
  } catch (error) {
    console.error("Error fetching address coordinates:", error.message);
    throw error;
  }
};

export {
  getDirections,
  findNearestHospital,
  getAddressCoordinates,
  generateMapLink,
  calculateDistance,
  calculateETA,
};
