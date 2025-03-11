# 🚑 AR-Based Emergency Route Simulator - Zenith

## 📌 Project Overview

Zenith is an **AR-powered emergency route simulator** that enhances ambulance navigation by providing real-time traffic updates, optimal routes, and live tracking through Augmented Reality (AR). The system consists of:

🔹 **Android UI** – Mobile application for route selection and navigation.
🔹 **MERN Stack Backend** – Handles route optimization, traffic updates, and real-time tracking.
🔹 **Unity (AR Simulation)** – Provides real-time AR visualization of ambulance movement.

---

## 🏗️ System Architecture

### 1️⃣ **Android UI (User Interface & Interaction Layer)**

📱 **Role:** Provides an intuitive **mobile app** for emergency responders to interact with routes in AR.

**Responsibilities:**
✅ Displays **Google Maps** for route selection.
✅ Sends **start & destination** data to the backend.
✅ Shows **ambulance tracking** received from Unity & backend.
✅ Provides **AR View toggle** to switch between 2D & AR navigation.
✅ Displays **traffic updates & emergency alerts**.

**Tech Stack:**
🛠 Flutter (Dart)
🛠 Google Maps API  
🛠 Firebase / WebSockets  
🛠 ARCore SDK

---

### 2️⃣ **MERN Stack Backend (Real-Time Processing & Data Handling)**

🌍 **Role:** Handles **route optimization, real-time ambulance tracking, and data communication**.

**Responsibilities:**
✅ Fetches **optimized routes** using **Google Maps API + A\***
✅ Stores **route data & emergency logs** in **MongoDB**.
✅ Uses **Socket.IO / Firebase Firestore** for **real-time communication**.
✅ Sends **live traffic updates** to **Android UI & Unity Simulation**.
✅ Processes **AI-driven rerouting** in case of roadblocks or congestion.
✅ Implements **voice commands processing (Text-to-Speech & Speech-to-Text API)**.

**Tech Stack:**
🛠 MongoDB  
🛠 Express.js + Node.js  
🛠 React.js (Admin dashboard)  
🛠 Socket.IO / Firebase  
🛠 Google Maps API

---

### 3️⃣ **Unity (AR Simulation for Route Visualization)**

🚑 **Role:** Provides an **interactive AR view of the ambulance’s real-time navigation**.

**Responsibilities:**
✅ Receives **real-time route updates** from the **MERN backend**.  
✅ Simulates **ambulance movement in an AR city model**.  
✅ Uses **ARCore (Android)** to overlay a **3D map** on a surface.  
✅ Updates **traffic & roadblock conditions dynamically**.  
✅ Allows **manual interaction** (zoom, rotate, traffic info).

**Tech Stack:**
🛠 Unity Engine  
🛠 ARCore SDK  
🛠 C#  
🛠 Socket.IO / Firebase

---

## 🔄 System Workflow

1️⃣ **User selects start & destination points** on the **Android app**.  
2️⃣ **MERN Backend** fetches **optimized routes** & stores data.  
3️⃣ **Backend sends** route & live traffic data to **Unity AR Simulation**.  
4️⃣ **Unity AR** displays **ambulance movement & traffic updates**.  
5️⃣ **Real-time changes** trigger dynamic **route updates**.  
6️⃣ **Android UI & Unity** receive new **route adjustments** in real-time.

---

## 📂 Folder Structure

```
Zenith/
│── src/
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── route.controller.js
│   │   ├── tracking.controller.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── errorHandler.js
│   │
│   ├── models/
│   │   ├── user.model.js
│   │   ├── route.model.js
│   │   ├── tracking.model.js
│   │
│   ├── routes/
│   │   ├── user.routes.js
│   │   ├── route.routes.js
│   │   ├── tracking.routes.js
│   │
│   ├── utils/
│   │   ├── logger.js
│   │   ├── errorHandler.js
│   │
│   ├── sockets/
│   │   ├── tracking.socket.js
│   │
│   ├── config/
│   │   ├── db.config.js
│   │   ├── firebase.config.js
│   │
│   ├── public/
│   │   ├── index.html
│   │
│   ├── app.js
│   ├── package.json
│   ├── .env
│
│── android-app/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── screens/
│   │   │   ├── home_screen.dart
│   │   │   ├── map_screen.dart
│   │   │   ├── ar_screen.dart
│   │
│── unity-ar/
│   ├── Assets/
│   │   ├── Scripts/
│   │   │   ├── RouteManager.cs
│   │   │   ├── ARController.cs
│   │
```

---

## 📌 API Endpoints

### **1️⃣ Health Check**

- `GET /api/v1/healthcheck` - Checks if the server is running.

### **2️⃣ Route Optimization**

- `POST /api/v1/routes/optimize` - Fetches the best route using Google Maps API.
- **Request Body:**

```json
{
  "start": "lat,lng",
  "destination": "lat,lng"
}
```

### **3️⃣ Live Ambulance Tracking**

- `GET /api/v1/tracking/:ambulanceId` - Fetches real-time ambulance location.

### **4️⃣ Nearest Hospital Suggestion**

- `GET /api/v1/hospitals/nearest?lat=xx&lng=yy` - Returns nearest hospitals.

### **5️⃣ Real-time Notifications**

- Uses **WebSockets** for alert updates.

### **6️⃣ Voice Processing**

- **Speech-to-Text** API for voice commands.
- **Text-to-Speech** API for route guidance.

---

## 🚀 Deployment (Render)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Chandi977/Zenith.git
   cd Zenith-Backend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Setup environment variables (`.env` file):**
   ```env
   MONGO_URI=your_mongo_uri
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   FIREBASE_CONFIG=your_firebase_config
   ```
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Access the live server on Render:**  
   🌍 [Zenith API Live](https://zenith-oy4b.onrender.com/api/v1/healthcheck)

---

## 🛠️ Future Enhancements

- **AI-driven predictive rerouting**.
- **Emergency vehicle priority handling**.
- **Multi-user support (Hospitals, Ambulance, Emergency Teams)**.

📌 **GitHub Repo:** [Zenith Backend](https://github.com/Chandi977/Zenith)
