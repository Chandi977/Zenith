import mongoose from "mongoose";

// Define schema for the ambulance
const ambulanceSchema = new mongoose.Schema(
  {
    // General Details
    driverName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    vehicleRegistrationNumber: { type: String, required: true },
    model: { type: String },
    status: {
      type: String,
      enum: ["available", "assigned"],
      default: "available",
    },

    // Geo-location
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // Geo-coordinates
    },
    currentLocation: { type: String }, // Location description (e.g., city, station, etc.)

    // Document Fields (Important Documents)
    pollutionDocument: { type: String, required: true },
    insuranceData: { type: String, required: true },
    vehicleModelNumber: { type: String, required: true },
    fitnessCertificate: { type: String, required: true },
    driverLicense: { type: String, required: true },
    permitDocument: { type: String, required: true },
    roadTaxReceipt: { type: String, required: true },

    // Driver & Hospital Information
    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AmbulanceDriver",
    }, // Current driver assigned to the ambulance
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" }, // Associated hospital (if any)

    // Availability
    available: { type: Boolean, default: true }, // Whether the ambulance is available for assignment or not
  },
  { timestamps: true }
);

// Virtual field to use _id as ambulanceId
ambulanceSchema.virtual("ambulanceId").get(function () {
  return this._id;
});

// Ensure `ambulanceId` is included when converting to JSON
ambulanceSchema.set("toJSON", { virtuals: true });
ambulanceSchema.set("toObject", { virtuals: true });
ambulanceSchema.index({ location: "2dsphere" });
// Create a model from the schema
const Ambulance = mongoose.model("Ambulance", ambulanceSchema);

export default Ambulance;
