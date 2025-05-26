import mongoose, { Schema } from "mongoose"; // Importing mongoose and Schema from mongoose to define the schema.
import jwt from "jsonwebtoken"; // Importing jsonwebtoken for generating JWT tokens.
import bcrypt from "bcrypt"; // Importing bcrypt for hashing passwords.

// Defining the schema for the User model
const userSchema = new Schema(
  {
    username: {
      type: String, // Field type is String
      required: true, // This field is required
      unique: true, // This field must be unique across documents
      lowercase: true, // Convert to lowercase
      trim: true, // Remove leading and trailing spaces
      index: true, // Create an index for this field
    },
    email: {
      type: String, // Field type is String
      required: true, // This field is required
      unique: true, // This field must be unique across documents
      lowercase: true, // Convert to lowercase
      trim: true, // Remove leading and trailing spaces
    },
    fullName: {
      type: String, // Field type is String
      required: true, // This field is required
      trim: true, // Remove leading and trailing spaces
      index: true, // Create an index for this field
    },
    avatar: {
      type: String,
      required: false,
      default: "",
    },
    password: {
      type: String, // Field type is String
      required: [true, "Password is required"], // Custom error message if the field is missing
      minlength: [8, "Password must be at least 8 characters"], // Minimum length validation
      maxlength: [72, "Password must not exceed 72 characters"], // Maximum length validation (bcrypt limit)
      select: false, // Don't include password in queries by default
    },
    refreshToken: {
      type: String, // Field type is String for storing refresh token
    },
    accessToken: {
      type: String, // Field type is String for storing access token
    },
    role: {
      type: String,
      enum: ["user", "ambulanceDriver", "admin"],
      default: "user",
    },
    isOnShift: { type: Boolean, default: false }, // Indicates if the driver is on a working shift
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  { timestamps: true } // Adding timestamps (createdAt and updatedAt) to the schema
);

// Middleware to hash the password ONLY on creation or password modification
// Remove or comment out the password hashing middleware
// userSchema.pre("save", async function(next) {
//   if (!this.isModified("password")) return next();
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Update password verification method with better error handling
userSchema.methods.isPasswordCorrect = async function (password) {
  try {
    if (!password || !this.password) {
      console.error("Missing password data:", {
        hasInputPassword: Boolean(password),
        hasStoredHash: Boolean(this.password),
      });
      return false;
    }

    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
};

// Method to generate a JWT access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id, // Include user ID in the token payload
      email: this.email, // Include email in the token payload
      username: this.username, // Include username in the token payload
      fullname: this.fullName, // Include fullName in the token payload
    },
    process.env.ACCESS_TOKEN_SECRET, // Secret key from environment variables
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // Token expiration time from environment variables
    }
  );
};

// Method to generate a JWT refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id, // Include user ID in the token payload
    },
    process.env.REFRESH_TOKEN_SECRET, // Secret key from environment variables
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // Token expiration time from environment variables
    }
  );
};

// Exporting the User model based on the userSchema
export const User = mongoose.model("User", userSchema);
