# OTP Service Documentation

## Overview

The OTP Service is responsible for generating, sending, and verifying One-Time Passwords (OTPs) for various authentication processes such as registration, login, and password reset. It supports different user types, including Users, Ambulance Service Providers, and Drivers.

## Features

- **OTP Generation**: Securely generates a 6-digit OTP.
- **OTP Hashing**: Encrypts OTPs using bcrypt for security.
- **OTP Expiration**: OTPs are valid for 5 minutes to enhance security.
- **Email Notification**: Sends OTPs via email using Nodemailer.
- **Multi-Purpose Support**: OTPs can be used for registration, login, and password reset.
- **User Type Handling**: Supports Users, Ambulance Providers, and Drivers.

## API Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/otp/send`

**Description:**
Sends an OTP to the user’s email for authentication.

**Request Body:**

```json
{
  "email": "user@example.com",
  "userType": "user", // Options: "user", "ambulance", "driver"
  "otpPurpose": "register" // Options: "register", "login", "resetPassword"
}
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "OTP sent for register"
}
```

**Error Responses:**

- `400 Bad Request`: Missing or invalid fields.
- `404 Not Found`: User does not exist when using login or reset password OTP.
- `500 Internal Server Error`: Email sending failure.

---

### 2. Verify OTP

**Endpoint:** `POST /api/otp/verify`

**Description:**
Verifies an OTP entered by the user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "OTP verified successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid OTP format.
- `401 Unauthorized`: OTP expired or incorrect.
- `500 Internal Server Error`: Database error.

## OTP Expiry Policy

- OTPs are **valid for 5 minutes**.
- Expired OTPs are automatically deleted from the database.

## Database Schema

### OTP Model (`otp.model.js`)

| Field     | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| email     | String | Yes      | The recipient's email |
| otp       | String | Yes      | Encrypted OTP value   |
| expiresAt | Date   | Yes      | Expiry timestamp      |

## Email Format

- **Subject:** Based on `otpPurpose` (e.g., "Zenith User Registration OTP").
- **Body:** Contains OTP and expiry details.

## Security Measures

- **Hashing:** OTPs are hashed before storage to prevent leaks.
- **Limited Validity:** OTPs expire in 5 minutes.
- **Email-Based Authentication:** Ensures OTPs are sent to verified users.

## Dependencies

- `express-async-handler`
- `otp-generator`
- `bcryptjs`
- `nodemailer`
- `mongoose`

## Usage Guidelines

1. **Ensure the `.env` file is configured** with email credentials.
2. **Integrate the API endpoints** into your authentication flow.
3. **Handle OTP expiration** on the frontend.
4. **Do not expose OTPs** in logs or responses.

## Future Enhancements

- Implement rate limiting to prevent OTP spam.
- Support SMS-based OTP delivery.

---

### Author

**Project:** Zenith Authentication Service  
**Maintainer:** Your Name  
**Contact:** your.email@example.com
