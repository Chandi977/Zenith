// Import necessary modules
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import Ambulance from "./models/ambulance.model.js";

// Load environment variables
dotenv.config({
  path: "./.env",
});

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
    } catch (error) {
      console.error("Error updating ambulance location:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Ambulance disconnected:", socket.id);
  });
});

// Connect to MongoDB and start the server
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MONGO DB CONNECTION FAILED!!!", err);
  });
