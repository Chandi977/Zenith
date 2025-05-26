import mongoose from "mongoose";

const routeSchema = new mongoose.Schema({
  startPoint: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: String,
  },
  endPoint: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: String,
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AmbulanceDriver",
    required: true,
  },
  waypoints: [
    {
      location: {
        type: {
          type: String,
          enum: ["Point"],
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      instruction: String,
      distance: String,
      duration: String,
      traffic: {
        type: String,
        enum: ["low", "moderate", "high", "severe"],
        default: "moderate",
      },
    },
  ],
  alternateRoutes: [
    {
      hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
      },
      hospitalName: String,
      estimatedTime: String,
      traffic: String,
    },
  ],
  estimatedTime: String,
  totalDistance: String,
  trafficSeverity: {
    type: String,
    enum: ["low", "moderate", "high", "severe"],
    default: "moderate",
  },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for geospatial queries
routeSchema.index({ startPoint: "2dsphere" });
routeSchema.index({ endPoint: "2dsphere" });

export default mongoose.model("Route", routeSchema);
