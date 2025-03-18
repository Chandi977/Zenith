import mongoose from "mongoose";

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/,
        "Invalid vehicle number format",
      ],
    },
    rcNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^[A-Z0-9]{10,15}$/, "Invalid RC number format"],
    },
    pollutionCertificateValidTill: {
      type: Date,
      required: true,
    },
    fitnessCertificateValidTill: {
      type: Date,
      required: true,
    },
    insuranceValidTill: {
      type: Date,
      required: true,
    },
    permitValidTill: {
      type: Date,
      required: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AmbulanceDriver", // Automatically assigned
      default: null,
    },
    ambulanceType: {
      type: String,
      enum: ["Basic", "Advanced", "ICU", "Neonatal"],
      required: true,
    },
    oxygenCylinderAvailable: {
      type: Boolean,
      default: false,
    },
    ventilatorAvailable: {
      type: Boolean,
      default: false,
    },
    stretcherAvailable: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["Available", "On Duty", "Under Maintenance"],
      default: "Available",
    },
    serviceStartDate: {
      type: Date,
      required: true,
    },
    lastServiceDate: {
      type: Date,
      required: true,
    },
    emergencyContact: {
      type: String,
      required: true,
      match: [
        /^\d{10}$/,
        "Please enter a valid 10-digit emergency contact number",
      ],
    },
  },
  { timestamps: true }
);

// Geospatial Index for efficient location querying
ambulanceSchema.index({ location: "2dsphere" });

const Ambulance = mongoose.model("Ambulance", ambulanceSchema);

export default Ambulance;
