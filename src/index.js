// Import the dotenv module to load environment variables from a .env file
import dotenv from "dotenv";

// Import the function to connect to the MongoDB database
import connectDB from "./db/index.js";

// Import the Express app configuration
import { app } from "./app.js";

// Load environment variables from the .env file located at the root of the project
dotenv.config({
  path: "./.env", // Path to the .env file
});

// Connect to the MongoDB database and start the server if successful
connectDB()
  .then(() => {
    // Start the Express server on the port defined in environment variables or default to 8000
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    // Log an error message if the connection to MongoDB fails
    console.log("MONGO DB CONNECTION FAILED!!!", err);
  });
