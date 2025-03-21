import axios from "axios";

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

// Fetch directions between two locations
const getDirections = async (origin, destination) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${googleMapsApiKey}`;
  try {
    const response = await axios.get(url);
    if (!response.data.routes || response.data.routes.length === 0) {
      console.error("No routes found in Google Maps API response");
      throw new Error("No routes found");
    }
    return response.data.routes[0]; // Return the first route
  } catch (error) {
    console.error("Error fetching directions:", error.message);
    throw new Error("Failed to fetch directions from Google Maps API");
  }
};

// Fetch hospital data by name using Google Maps API
const getAddressCoordinates = async (address) => {
  try {
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      address
    )}&key=${googleMapsApiKey}`;
    const response = await axios.get(googleMapsUrl);

    if (response.data.status !== "OK") {
      throw new Error(
        response.data.error_message || "Failed to fetch hospital data."
      );
    }

    return response.data.results.map((hospital) => ({
      id: hospital.place_id,
      name: hospital.name.toLowerCase(), // Normalize name for matching
      address: hospital.formatted_address,
      location: hospital.geometry.location,
      rating: hospital.rating || "Not rated",
    }));
  } catch (error) {
    console.error("Error fetching hospital data:", error.message);
    throw error;
  }
};

// Calculate distance between two geographical points using the Haversine formula
const calculateDistance = (location1, location2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers

  const lat1 = toRadians(location1.latitude);
  const lon1 = toRadians(location1.longitude);
  const lat2 = toRadians(location2.latitude);
  const lon2 = toRadians(location2.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
};

// Generate a Google Maps link for navigation between two locations
const generateMapLink = (startLocation, endLocation) => {
  const startLat = startLocation.latitude || startLocation.lat;
  const startLng = startLocation.longitude || startLocation.lng;
  const endLat = endLocation.latitude || endLocation.lat;
  const endLng = endLocation.longitude || endLocation.lng;

  if (!startLat || !startLng || !endLat || !endLng) {
    throw new Error(
      `Invalid startLocation or endLocation. Both must have valid latitude and longitude. Received: startLocation=${JSON.stringify(
        startLocation
      )}, endLocation=${JSON.stringify(endLocation)}`
    );
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}`;
};

// Ensure calculateETA is exported
export {
  getDirections,
  calculateDistance,
  getAddressCoordinates,
  generateMapLink, // Export the new function
};
