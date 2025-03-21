import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Fetch nearby hospitals using Google Maps API
const getHospitals = async (req, res) => {
  try {
    const { latitude, longitude } = req.query; // Expecting lat/lng from the request query
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: "Latitude and Longitude are required to fetch nearby hospitals.",
      });
    }

    const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=hospital&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await axios.get(googleMapsUrl);

    const hospitals = response.data.results.map((hospital) => ({
      id: hospital.place_id, // Unique hospital ID from Google Maps
      name: hospital.name,
      address: hospital.vicinity,
      location: hospital.geometry.location,
      contact: hospital.formatted_phone_number || "Not available", // Contact info if available
      rating: hospital.rating || "Not rated", // Hospital rating
    }));

    res.status(200).json({
      message: "Nearby hospitals fetched successfully.",
      hospitals,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch hospitals.",
      details: error.response?.data?.error_message || error.message,
    });
  }
};

export { getHospitals };
