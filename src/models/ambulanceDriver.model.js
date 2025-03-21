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
      required: true, // Hospital is mandatory for registration
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
  if (!this.isModified("password")) return next(); // Proceed if password is not modified

  this.password = await bcrypt.hash(this.password, 10); // Hash the password with a salt rounds of 10
  next(); // Proceed to the next middleware or save the document
});

ambulanceDriverSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password); // Compare provided password with stored hashed password
};

const AmbulanceDriver = mongoose.model(
  "AmbulanceDriver",
  ambulanceDriverSchema
);

export default AmbulanceDriver;
