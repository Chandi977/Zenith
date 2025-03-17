import mongoose from "mongoose";
import AmbulanceDriver from "./ambulanceDriver.model.js";

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true },
    vehicleRegistrationNumber: { type: String, required: true },
    model: { type: String },
    status: {
      type: String,
      enum: ["available", "assigned"],
      default: "available",
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    currentLocation: { type: String },
    pollutionDocument: { type: String, required: true },
    insuranceData: { type: String, required: true },
    vehicleModelNumber: { type: String, required: true },
    fitnessCertificate: { type: String, required: true },
    driverLicense: { type: String, required: true },
    permitDocument: { type: String, required: true },
    roadTaxReceipt: { type: String, required: true },
    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AmbulanceDriver",
      default: null,
    },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ambulanceSchema.index({ location: "2dsphere" });

// Middleware to automatically assign an available driver
ambulanceSchema.pre("save", async function (next) {
  if (!this.currentDriver) {
    try {
      // Find an available driver who has no ambulance assigned
      const driver = await AmbulanceDriver.findOneAndUpdate(
        { available: true },
        { available: false },
        { new: true }
      );

      if (driver) {
        this.currentDriver = driver._id;
        await AmbulanceDriver.findByIdAndUpdate(driver._id, {
          ambulance: this._id,
        });
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
    }
  }
  next();
});

const Ambulance = mongoose.model("Ambulance", ambulanceSchema);

export default Ambulance;
