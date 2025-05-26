import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
    },
    sosRequestId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
    },
    routeType: {
      type: String,
      enum: ["driver-to-patient", "patient-to-hospital"],
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Generate unique route ID
routeSchema.pre("save", async function (next) {
  if (this.isNew) {
    const date = new Date();
    const timestamp = date.getTime();
    this.routeId = `RT${timestamp}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

export default mongoose.model("Route", routeSchema);
