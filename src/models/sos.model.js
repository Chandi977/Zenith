import mongoose from "mongoose";

const sosSchema = new mongoose.Schema(
  {
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "assigned", "completed"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const SOS = mongoose.model("SOS", sosSchema);

export default SOS;
