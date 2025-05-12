// Import necessary modules
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import Ambulance from "./models/ambulance.model.js";
import { rotateDriverShifts } from "./controllers/ambulanceDriver.controller.js";
import admin from "firebase-admin"; // Firebase Admin SDK
import events from "events"; // Ensure this import exists

// Load environment variables
dotenv.config({
  path: "./.env",
});

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  firebaseConfig.private_key = firebaseConfig.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
} else {
  admin.app(); // Use the already initialized app
}

// Increase the maximum number of event listeners
events.EventEmitter.defaultMaxListeners = 20;

// Function to send Firebase notifications
const sendFirebaseNotification = async (token, payload) => {
  try {
    await admin.messaging().sendToDevice(token, payload);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Create an HTTP server using Express
const server = http.createServer(app);

// Initialize Socket.io for real-time communication
const io = new Server(server, {
  cors: {
    origin: "*", // You can replace * with specific allowed origins if needed
    methods: ["GET", "POST"],
  },
});

// WebSocket: Handle live ambulance location updates
io.on("connection", (socket) => {
  console.log("Ambulance connected:", socket.id);

  socket.on("updateLocation", async ({ ambulanceId, latitude, longitude }) => {
    try {
      if (!latitude || !longitude) return;

      // Update ambulance location in MongoDB
      await Ambulance.findByIdAndUpdate(ambulanceId, {
        "location.coordinates": [longitude, latitude],
      });

      console.log(`Updated location for ambulance ${ambulanceId}`);

      // Broadcast location update to all clients
      socket.broadcast.emit("locationUpdate", {
        ambulanceId,
        latitude,
        longitude,
      });
    } catch (error) {
      console.error("Error updating ambulance location:", error);
    }
  });

  socket.on("sendNotification", async ({ token, payload }) => {
    await sendFirebaseNotification(token, payload);
  });

  socket.on("disconnect", () => {
    console.log("Ambulance disconnected:", socket.id);
  });
});

// ✅ No clustering: just connect DB and start the server directly
connectDB()
  .then(async () => {
    console.log("✅ MongoDB connected successfully!");
    await rotateDriverShifts(); // Trigger shift rotation

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MONGO DB CONNECTION FAILED!!!", err);
  });
