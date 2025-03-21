import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    startPoint: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    endPoint: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    waypoints: [
      {
        latitude: { type: Number },
        longitude: { type: Number },
        traffic: { type: String, enum: ["low", "moderate", "high"] },
      },
    ],
    estimatedTime: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Route = mongoose.model("Route", routeSchema);

export default Route;
