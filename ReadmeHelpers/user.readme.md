# User Controller API Documentation

## Overview

The User Controller API provides endpoints for user registration, authentication, profile management, and security features such as OTP verification and token refresh. It is designed to work seamlessly with Android applications using Retrofit for API calls.

---

## Base URL

```
https://zenith-oy4b.onrender.com/api/v1/
```

---

## Features

- **User Registration**: Allows new users to register with OTP verification.
- **Authentication**: Provides secure login and logout functionality.
- **Profile Management**: Enables users to update their profile details and upload profile photos.
- **Token Management**: Supports access token refresh for seamless authentication.
- **SOS Requests**: Allows users to send emergency SOS requests.

---

## Endpoints

### 1. Register User

**Endpoint:** `POST /register`  
**Description:** Registers a new user with OTP verification.

**Request Body:**

```json
{
  "fullName": "John Doe",
  "email": "johndoe@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "address": "123 Street, City",
  "mobileNumber": "+1234567890",
  "otp": "123456"
}
```

**Response:**

```json
{
  "status": 201,
  "data": { "userId": "12345", "username": "johndoe" },
  "message": "User registered successfully"
}
```

---

### 2. Login User

**Endpoint:** `POST /login`  
**Description:** Authenticates the user and returns access tokens.

**Request Body:**

```json
{
  "email": "johndoe@example.com",
  "password": "securepassword",
  "otp": "123456"
}
```

**Response:**

```json
{
  "status": 200,
  "data": {
    "accessToken": "your_access_token",
    "refreshToken": "your_refresh_token"
  },
  "message": "Login successful"
}
```

---

### 3. Reset Password

**Endpoint:** `POST /reset-password`  
**Description:** Resets the user password using OTP verification.

**Request Body:**

```json
{
  "email": "johndoe@example.com",
  "newPassword": "newsecurepassword",
  "otp": "123456"
}
```

**Response:**

```json
{
  "status": 200,
  "message": "Password reset successfully"
}
```

---

### 4. Upload User Data

**Endpoint:** `PUT /update/:userId`  
**Description:** Updates user profile details.

**Request Body:**

```json
{
  "address": "456 Avenue, New City",
  "mobileNumber": "+9876543210"
}
```

**Response:**

```json
{
  "status": 200,
  "message": "User data updated successfully"
}
```

---

### 5. Upload User Photo

**Endpoint:** `POST /upload-photo/:userId`  
**Description:** Uploads a profile picture for the user using Cloudinary.

**Request Format:** `multipart/form-data`

**Response:**

```json
{
  "status": 200,
  "data": { "avatarUrl": "https://cdn.example.com/profile.jpg" },
  "message": "User photo uploaded successfully"
}
```

#### Cloudinary Integration

Cloudinary is used for secure and efficient image uploads.

**Code Implementation:**

```javascript
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

const removeFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};

export { uploadOnCloudinary, removeFromCloudinary };
```

---

### 6. Get Current User

**Endpoint:** `GET /me`  
**Description:** Fetches the authenticated user’s profile.

**Response:**

```json
{
  "status": 200,
  "data": {
    "userId": "12345",
    "username": "johndoe",
    "email": "johndoe@example.com"
  },
  "message": "Current user fetched successfully"
}
```

---

### 7. Logout User

**Endpoint:** `POST /logout`  
**Description:** Logs out the user by clearing authentication tokens.

**Response:**

```json
{
  "status": 200,
  "message": "Logout successful"
}
```

---

### 8. Refresh Tokens

**Endpoint:** `POST /refresh-tokens`  
**Description:** Refreshes the access and refresh tokens.

**Response:**

```json
{
  "status": 200,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  },
  "message": "Tokens refreshed successfully"
}
```

---

## Authentication & Headers

- **Authorization:** All protected routes require a Bearer Token in the `Authorization` header:
  ```
  Authorization: Bearer <accessToken>
  ```
- **Content-Type:**
  ```
  application/json
  ```

---

## Error Handling

Errors are returned in the following format:

```json
{
  "status": 400,
  "error": "Invalid OTP"
}
```

---

## Notes for Android UI Developers

- Use `Retrofit` for API calls.
- Ensure secure storage of authentication tokens using `EncryptedSharedPreferences`.
- Implement error handling for network failures and invalid responses.
- Use `Glide` or `Coil` for loading user profile images.
- Handle token expiration by implementing auto-refresh with `refresh-tokens` API.

For further assistance, refer to the API documentation or contact the backend team.

# Firebase Notification Integration

## Overview

Zenith now supports real-time notifications using Firebase Cloud Messaging (FCM). This feature enables Android devices to receive alerts for SOS requests, route updates, and other critical events.

## Firebase Notification API

### 1. Send Notification

**Endpoint:** WebSocket Event: `sendNotification`

**Description:** Sends a notification to an Android device using Firebase.

**Payload:**

```json
{
  "token": "device_fcm_token",
  "payload": {
    "notification": {
      "title": "Emergency Alert",
      "body": "An ambulance is on its way to your location."
    },
    "data": {
      "type": "SOS",
      "location": "28.7041, 77.1025"
    }
  }
}
```

**Response:** Acknowledgment of notification delivery.

### Notes

- Ensure the Android app is configured with the correct Firebase project.
- Use the `sendNotification` WebSocket event to trigger notifications.
