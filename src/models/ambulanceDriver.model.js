import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // Import jwt for token generation

const { Schema } = mongoose;

const ambulanceDriverSchema = new Schema(
  {
    driverName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Important: This makes password excluded by default
    },
    contactNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit contact number"],
    },
    // driverLicense: { type: String, required: true },
    age: { type: Number, required: true, min: 18 },
    drivingExperience: { type: Number, required: true, min: 0, max: 99 },
    // govtIdProof: { type: String, required: true },
    govtIdNumber: { type: String, required: true },
    // driverPhoto: { type: String, required: true },
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

// Remove or comment out the pre-save middleware to prevent double hashing
// ambulanceDriverSchema.pre("save", async function (next) {...});

// Fix the password verification method
ambulanceDriverSchema.methods.isPasswordCorrect = async function (password) {
  try {
    console.log("\nDriver Password Verification Debug:");
    console.log("Input password length:", password?.length);
    console.log("Stored hash length:", this.password?.length);

    if (!password || !this.password) {
      throw new Error("Missing password or hash");
    }

    // Use bcrypt.compare directly
    const isValid = await bcrypt.compare(password, this.password);
    console.log("Password verification result:", isValid);

    return isValid;
  } catch (error) {
    console.error("Password verification failed:", error.message);
    return false;
  }
};

// Add token generation methods
ambulanceDriverSchema.methods.generateAccessToken = function () {
  try {
    const accessToken = jwt.sign(
      {
        _id: this._id,
        email: this.email,
        driverName: this.driverName,
        role: "DRIVER",
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );
    return accessToken;
  } catch (error) {
    throw new Error("Error generating access token");
  }
};

ambulanceDriverSchema.methods.generateRefreshToken = function () {
  try {
    const refreshToken = jwt.sign(
      {
        _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      }
    );
    return refreshToken;
  } catch (error) {
    throw new Error("Error generating refresh token");
  }
};

// Add refreshToken field to schema
ambulanceDriverSchema.add({
  refreshToken: {
    type: String,
    select: false,
  },
});

const AmbulanceDriver = mongoose.model(
  "AmbulanceDriver",
  ambulanceDriverSchema
);

export default AmbulanceDriver;
