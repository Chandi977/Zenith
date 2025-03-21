// Import necessary modules
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import Ambulance from "./models/ambulance.model.js";
import { rotateDriverShifts } from "./controllers/ambulanceDriver.controller.js";
import cluster from "cluster";
import os from "os";
import admin from "firebase-admin"; // Firebase Admin SDK

// Load environment variables
dotenv.config({
  path: "./.env",
});

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
  });
} else {
  admin.app(); // Use the already initialized app
}

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
    origin: "*",
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

// Enable PM2 cluster mode for load balancing
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary process running. Forking ${numCPUs} workers...`);

  // Trigger shift rotation only in the primary process
  connectDB()
    .then(async () => {
      console.log("✅ MongoDB connected successfully!");
      await rotateDriverShifts(); // Trigger shift rotation
    })
    .catch((err) => {
      console.error("❌ Error during driver shift rotation:", err);
    });

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} exited. Forking a new worker...`);
    cluster.fork();
  });
} else {
  connectDB()
    .then(() => {
      const PORT = process.env.PORT || 8000;
      server.listen(PORT, () => {
        console.log(`🚀 Worker ${process.pid} running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ MONGO DB CONNECTION FAILED!!!", err);
    });
}
