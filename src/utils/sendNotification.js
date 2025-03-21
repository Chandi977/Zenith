import admin from "firebase-admin"; // Ensure Firebase Admin SDK is imported
import SOS from "../models/sos.model.js"; // Import the SOS model

const sendNotification = async (userId, notification) => {
  if (!userId) {
    console.error("Invalid userId. Notification not sent.");
    return;
  }

  if (!notification || !notification.type) {
    console.error("Invalid notification object. Notification not sent.");
    return;
  }

  if (notification.type === "SOS") {
    try {
      if (!notification.ambulanceDriver) {
        console.error(
          "No ambulanceDriver specified. SOS notification not sent."
        );
        return;
      }

      const sos = new SOS({
        senderId: userId, // The user generates the SOS request
        recipientId: notification.ambulanceDriver, // Notification is sent to the ambulanceDriver
        message: notification.message,
        location: notification.location,
        priority: notification.priority || "Medium", // Default to Medium if not provided
      });
      await sos.save();
      console.log("SOS notification saved:", sos);

      // Simulate urgent notification handling
      if (notification.priority === "High") {
        console.log(
          "Urgent SOS alert sent to authorities or emergency contacts."
        );
        // Placeholder for integration with emergency services
        try {
          console.log("Emergency services notified.");
        } catch (emergencyError) {
          console.error("Error notifying emergency services:", emergencyError);
        }
      }
    } catch (error) {
      console.error("Error saving SOS notification:", error);
    }
  } else if (notification.type === "AMBULANCE_ON_THE_WAY") {
    try {
      if (!notification.hospitalName || !notification.ambulanceDetails) {
        console.error(
          "Missing hospitalName or ambulanceDetails. Notification not sent."
        );
        return;
      }

      const ambulanceNotification = {
        message: `Ambulance is on the way to your location and heading to ${notification.hospitalName}.`,
        hospitalName: notification.hospitalName,
        expectedTime: notification.ambulanceDetails.expectedTime, // e.g., "15 minutes"
        distance: notification.ambulanceDetails.distance, // e.g., "5 km"
        speed: notification.ambulanceDetails.speed, // e.g., "60 km/h"
        mapLink: notification.ambulanceDetails.mapLink, // Link to track ambulance on the map
      };

      console.log("Ambulance notification details:", ambulanceNotification);

      // Simulate sending the notification to the user
      console.log(
        `Notification sent to user ${userId}:`,
        ambulanceNotification
      );
      // Placeholder for integration with a real notification service
      // notificationService.send(userId, ambulanceNotification);
      console.log("Notification service integration placeholder executed.");
    } catch (error) {
      console.error("Error sending ambulance notification:", error);
    }
  } else {
    console.warn(`Unhandled notification type: ${notification.type}`);
    console.log("Notification details:", notification); // Added for debugging
  }

  // Simulate sending notification
  try {
    console.log(`Notification sent to user ${userId}:`, notification);
    // Placeholder for integration with a real notification service
    // notificationService.send(userId, notification);
    console.log("Notification service integration placeholder executed.");
  } catch (notificationError) {
    console.error(
      "Error in notification service integration:",
      notificationError
    );
    console.log("Fallback: Logging notification locally.");
  }
};

const sendFirebaseNotification = async (token, payload) => {
  try {
    await admin.messaging().sendToDevice(token, payload);
    console.log("Firebase notification sent successfully");
  } catch (error) {
    console.error("Error sending Firebase notification:", error);
  }
};

const processVoiceCommand = async (command) => {
  // Placeholder for voice command processing logic
  console.log("Processing voice command:", command);
  // Integrate with Speech-to-Text API here
};

export { sendNotification, processVoiceCommand, sendFirebaseNotification };
