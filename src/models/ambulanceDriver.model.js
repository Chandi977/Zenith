import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ambulanceDriverSchema = new mongoose.Schema(
  {
    driverName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: { type: String, required: true, minlength: 6 },
    contactNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit contact number"],
    },
    driverLicense: { type: String, required: true },
    age: { type: Number, required: true, min: 18 },
    drivingExperience: { type: Number, required: true, min: 0, max: 99 },
    govtIdProof: { type: String, required: true },
    govtIdNumber: { type: String, required: true },
    driverPhoto: { type: String, required: true },
    available: { type: Boolean, default: true }, // Initially available
    ambulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance", // Reference to the assigned ambulance
      default: null, // Assigned only when linked to an ambulance
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital", // Reference to the associated hospital
      required: false, // Change from true to false
    },
    assignedShift: {
      type: String,
      enum: ["Morning", "Afternoon", "Night", "SOS"], // Added "SOS" as a valid enum value
      required: true,
    },
    userRatings: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: { type: Number, required: true, min: 0, max: 5 },
      },
    ],
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

ambulanceDriverSchema.virtual("averageRating").get(function () {
  return this.userRatings.length === 0
    ? 0
    : this.userRatings.reduce((sum, rating) => sum + rating.rating, 0) /
        this.userRatings.length;
});

ambulanceDriverSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    console.log("Original password before hash:", this.password);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("Password after hashing:", this.password);
    next();
  } catch (error) {
    console.error("Password hashing error:", error);
    next(error);
  }
});

ambulanceDriverSchema.methods.isPasswordCorrect = async function (
  candidatePassword
) {
  try {
    console.log("Password check debug:");
    console.log("Input password:", candidatePassword);
    console.log("Stored hashed password:", this.password);

    // Try to decode hash (for debugging only - remove in production)
    const isValid = await bcrypt.compare(candidatePassword, this.password);
    console.log("Password match result:", isValid);

    return isValid;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
};

const AmbulanceDriver = mongoose.model(
  "AmbulanceDriver",
  ambulanceDriverSchema
);

export default AmbulanceDriver;
