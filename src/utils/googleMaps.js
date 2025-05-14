import axios from "axios";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Function to calculate distance between two locations
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

    // Constants and helper function
    const R = 6371; // Earth's radius in km
    const toRadians = (degrees) => (degrees * Math.PI) / 180;

    // Convert coordinates to radians first
    const lat1 = toRadians(location1.latitude);
    const lat2 = toRadians(location2.latitude);
    const lon1 = toRadians(location1.longitude);
    const lon2 = toRadians(location2.longitude);

    // Calculate differences after conversion
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // Haversine formula
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return Number(distance.toFixed(2));
  } catch (error) {
    console.error("Error calculating distance:", error);
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
