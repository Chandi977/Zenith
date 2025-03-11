import mongoose from "mongoose";

// Define the ambulance driver schema
const ambulanceDriverSchema = new mongoose.Schema(
  {
    driverName: {
      type: String,
      required: [true, "Driver name is required"],
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      unique: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit contact number"],
    },
    driverLicense: {
      type: String,
      required: [true, "Driver license is required"],
    },
    age: {
      type: Number,
      required: [true, "Age is required"],
      min: [18, "Driver must be at least 18 years old"],
    },
    drivingExperience: {
      type: Number,
      required: [true, "Driving experience is required"],
      min: [0, "Driving experience cannot be negative"],
      max: [99, "Driving experience cannot exceed 99 years"],
    },
    govtIdProof: {
      type: String,
      enum: ["AADHAR", "PAN", "Voter ID", "Passport", "Driving License"],
      required: [true, "Government ID proof is required"],
    },
    govtIdNumber: {
      type: String,
      required: [true, "Government ID number is required"],
    },
    driverPhoto: {
      type: String, // Store the URL of the photo
      required: [true, "Driver photo is required"],
    },
    available: {
      type: Boolean,
      default: true, // Initially assume the driver is available
    },
    ambulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      required: [true, "Ambulance reference is required"],
    },
    assignedShift: {
      type: String,
      enum: ["Morning", "Afternoon", "Night"], // Define shifts for the driver
      required: [true, "Assigned shift is required"],
    },
    userRatings: {
      type: [Number], // Array of ratings given by users
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Virtual to calculate average rating from userRatings array
ambulanceDriverSchema.virtual("averageRating").get(function () {
  if (this.userRatings.length === 0) return 0;
  const total = this.userRatings.reduce((sum, rating) => sum + rating, 0);
  return total / this.userRatings.length;
});

// Create an index for the contact number to ensure it's unique
ambulanceDriverSchema.index({ contactNumber: 1 }, { unique: true });

// Compile the model
const AmbulanceDriver = mongoose.model(
  "AmbulanceDriver",
  ambulanceDriverSchema
);

export default AmbulanceDriver;
