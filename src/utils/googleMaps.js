import axios from "axios";

// Function to get directions between two locations using Google Maps API
const getDirections = async (origin, destination) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key is not configured");
  }

  const googleMapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;

  try {
    const response = await axios.get(googleMapsUrl);
    if (response.data.status !== "OK") {
      throw new Error("Failed to fetch directions from Google Maps API");
    }
    return response.data.routes[0];
  } catch (error) {
    console.error("Error fetching directions:", error.message);
    throw error;
  }
};

// Function to get address coordinates using Google Maps Geocoding API
const getAddressCoordinates = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key is not configured");
  }

  const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(googleMapsUrl);
    if (response.data.status !== "OK") {
      throw new Error(
        "Failed to fetch address coordinates from Google Maps API"
      );
    }
    return response.data.results.map((result) => ({
      name: result.formatted_address,
      location: result.geometry.location,
      placeId: result.place_id,
    }));
  } catch (error) {
    console.error("Error fetching address coordinates:", error.message);
    throw error;
  }
};

// Function to calculate distance between two locations
const calculateDistance = (location1, location2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const lat1 = toRadians(location1.latitude);
  const lon1 = toRadians(location1.longitude);
  const lat2 = toRadians(location2.latitude);
  const lon2 = toRadians(location2.longitude);

  const dLat = lat2 - lat1;
  const dLon = dLon - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return distance;
};

// Function to calculate Estimated Time of Arrival (ETA) between two locations
const calculateETA = (startLocation, endLocation, speed) => {
  const distance = calculateDistance(startLocation, endLocation); // Use the existing calculateDistance function
  const time = distance / speed; // Time = Distance / Speed
  return `${Math.ceil(time * 60)} mins`; // Convert time to minutes and round up
};

// Function to find the nearest hospital using Google Maps Places API
const findNearestHospital = async (location) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key is not configured");
  }

  const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=5000&type=hospital&key=${apiKey}`;

  try {
    const response = await axios.get(googleMapsUrl);
    if (response.data.status !== "OK") {
      throw new Error("Failed to fetch nearby hospitals from Google Maps API");
    }

    const nearestHospital = response.data.results[0];
    if (!nearestHospital) {
      throw new Error("No hospitals found nearby");
    }

    return {
      name: nearestHospital.name,
      location: nearestHospital.geometry.location,
      placeId: nearestHospital.place_id,
    };
  } catch (error) {
    console.error("Error fetching nearest hospital:", error.message);
    throw error;
  }
};

// Function to generate a Google Maps link for navigation
const generateMapLink = (startLocation, endLocation) => {
  const baseUrl = "https://www.google.com/maps/dir/?api=1";
  const origin = `origin=${startLocation.latitude},${startLocation.longitude}`;
  const destination = `destination=${endLocation.latitude},${endLocation.longitude}`;
  return `${baseUrl}&${origin}&${destination}`;
};

export {
  calculateDistance,
  getDirections,
  getAddressCoordinates,
  findNearestHospital,
  calculateETA,
  generateMapLink, // Export the generateMapLink function
};
