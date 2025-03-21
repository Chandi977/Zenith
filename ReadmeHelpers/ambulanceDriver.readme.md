# Ambulance Driver Controller API Documentation

## Overview

The Ambulance Driver Controller API provides endpoints for managing ambulance drivers, including registration, login, shift updates, and SOS handling.

---

## Base URL

```
https://zenith-oy4b.onrender.com/api/v1/ambulanceDriver
```

---

## Features

- **Driver Registration**: Register new ambulance drivers with document uploads.
- **Login**: Authenticate drivers with OTP verification.
- **Shift Management**: Update and rotate driver shifts.
- **SOS Handling**: Assign drivers to SOS requests.
- **Ratings**: Add and fetch driver ratings.

---

## Endpoints

### 1. Register Driver

**Endpoint:** `POST /register`  
**Description:** Registers a new ambulance driver with document uploads.

**Request Body:** (Multipart Form Data)

```json
{
  "driverName": "John Doe",
  "email": "johndoe@example.com",
  "password": "securepassword",
  "contactNumber": "9876543210",
  "age": 30,
  "drivingExperience": 5,
  "govtIdNumber": "ID123456",
  "assignedShift": "Morning",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "hospital": "64a1234567890abcdef1234", // Hospital ID
  "otp": "123456"
}
```

**Response:**

```json
{
  "message": "Ambulance driver created successfully",
  "driver": {
    "driverName": "John Doe",
    "hospital": "City Hospital", // Hospital name in response
    ...
  }
}
```

---

### 2. Login Driver

**Endpoint:** `POST /login`  
**Description:** Authenticates a driver with OTP verification.

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
  "message": "Login successful",
  "driver": { ...driverDetails },
  "token": "jwt_token"
}
```

---

### 3. Update Driver Shift

**Endpoint:** `PATCH /:id/shift`  
**Description:** Updates the shift of a specific driver.

**Request Body:**

```json
{
  "assignedShift": "Afternoon"
}
```

**Response:**

```json
{
  "message": "Driver shift updated successfully",
  "driver": { ...updatedDetails }
}
```

---

### 4. Add Driver Rating

**Endpoint:** `POST /:id/rating`  
**Description:** Adds a rating to a specific driver.

**Request Body:**

```json
{
  "rating": 4.5
}
```

**Response:**

```json
{
  "message": "Rating added successfully",
  "averageRating": 4.3
}
```

---

### 5. Handle SOS Request

**Endpoint:** `POST /sos/handle`  
**Description:** Assigns a driver to an SOS request.

**Request Body:**

```json
{
  "userId": "64a1234567890abcdef1234",
  "location": { "latitude": 28.7041, "longitude": 77.1025 }
}
```

**Response:**

```json
{
  "message": "SOS request received and driver assigned",
  "driver": { ...driverDetails }
}
```

---

## Notes for Developers

- Use the `register` endpoint to onboard new drivers with document uploads.
- Ensure OTP verification is implemented for secure login.
- Use the `sos/handle` endpoint for real-time SOS handling in emergencies.

For further assistance, contact the backend team.
