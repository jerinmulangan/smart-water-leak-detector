## smart-water-leak-detector

## IoT Water Leak Detection System

An IoT-based system designed to detect and alert users of potential water leaks in real time. 
This project uses sensors, a microcontroller (ESP32), and cloud integration to monitor water flow
and detect anomalies that indicate leaks.

## Overview
Traditional water leak systems rely on flow sensors or moisture detectors. This project introduces
a **vision-based leak detection** approach using the **ESP32-S3 Sense Camera** and **Gemini AI Model**. The system not only detects leaks but also identifies **where** they are located - drawing bounding boxes on problem areas and providing contextual data like water pressure.

---

## Features
- Captures real-time images from the ESP32-S3 Sense camera.
- Sends images to backend for AI analysis via Gemini API.
- Detects and labels to backend for AI analysis via Gemini API.
- Detects and labels leak regious (x, y, width, height).
- Draws bounding boxes around damaged or leaking areas.
- Retrieves and displays pressure data (endPressur1, endPressure2).
- Sends alert notification with annotated images to the user.

---

### System Architecture

**1. ESP32.S3 Sense**
- Captures image snapshots of plumbing/wall regions
- Sends images via HTTP POST to backend server
- Optionally captures sensor data (pressure1, pressure2)

**2. Backend Server**
- Receives image data and metadata
- Sends image to **Gemini API** for vision analysis.
- Receives boudning box coordinates and leak labels
- Draws rectangles around leak areas
- Generates annotated images and sends alerts to user

**3. Gemini API**
- Processes image and returns leak/damage detection data
- Returns bounding boxes (x, y, width, height) and confidence values

**4. User Notification System**
- Displays processed image highlighting leaks
- Shows corresponding pressure data and leak confidence level

---

## Technologies Used
| Layer | Technology | Purpose |
|-------|-------------|----------|
| Hardware | ESP32-S3 Sense | Image capture & Wi-Fi transmission |
| AI/ML | Google Gemini API | Leak detection & bounding box generation |
| Backend | Node.js | API processing, image drawing, notifications |
| Data | JSON / MQTT | Data exchange and cloud storage |


## Setup & Installation
1. **Clone the Repository**
   ```bash
   git clone https://github.com/ggstephen6724/smart-water-leak-detection.git

2. **ESP32 Setup**
   Flash firmware from firmware/ folder using Arduino IDE or PlatformIO.
   Update Wi-Fi credentials in config.h.
   Set backend endpoint URL in [main.cpp or whatever it was]

3. **Backend Setup**
   install dependencies:
     npm install  # or pip install -r requirements.txt
   Add your Gemini API key to .env
   Run the server:
     node index.js
     node test_simulation_esp32.js

4. **Test the System**
   ESP32 will send an image to backend on startup.
   Backend sends it to Gemini, receives coordinates, and returns annotated results.
   Confirm alert message or image appears in console/dashboard.

## Future Improvements 
  Real-time video stream leak detection
  Edge AI inference using TensorFlow Lite Micro on ESP32
  Integration with mobile app for instant alerts
  Water usage analytics dashboard

## Contributers
  George Stephen - AI Integration, System Architecture, Backend API development, Gemini processing 

## LICENSE
This projet is released under the MIT License. See LICENSE for more information.

