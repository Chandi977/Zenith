import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    departments: [{ type: String }], // Array of department names
    placeId: { type: String, unique: true }, // Google Maps place_id
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    rating: { type: Number, default: null }, // Hospital rating
  },
  { timestamps: true }
);

const Hospital = mongoose.model("Hospital", hospitalSchema);

export default Hospital;
