## smart-water-leak-detector

## IoT Water Leak Detection System

An IoT-based system designed to detect and alert users of potential water leaks in real time. 
This project uses sensors, a microcontroller (ESP32), and AI-powered vision analysis to monitor water flow
and detect anomalies that indicate leaks.

> **DEMO STATUS**: This system is currently in demonstration mode. The AI model is trained on only 20 images and requires 300+ diverse training images for production-grade accuracy. See [Model Status](#model-status) below.

## Overview
Traditional water leak systems rely on flow sensors or moisture detectors. This project introduces
a **vision-based leak detection** approach using the **ESP32-S3 Sense Camera** and **YOLOv8 AI Model**. The system not only detects leaks but also identifies **where** they are located - drawing bounding boxes on problem areas and providing contextual data like water pressure.

---

## Features
- Captures real-time images from the ESP32-S3 Sense camera
- Sends images to backend for AI analysis via YOLOv8 model
- Detects and labels leak regions (x, y, width, height)
- Draws bounding boxes around damaged or leaking areas
- Retrieves and displays pressure data (endPressure1, endPressure2)
- Sends alert notifications with annotated images to user
- Automatic water damage detection using image processing and edge detection

---

## Model Status

### Current Implementation (Demo)
- **Model**: YOLOv8n (nano) - fine-tuned on 20 water leak images
- **Status**: **DEMONSTRATION ONLY**
- **Accuracy**: Low confidence (25% detection threshold due to limited training data)
- **Performance**: All detections appear at uniform confidence levels (model hasn't converged)
- **Training Images**: 16 (minimum 300+ recommended for production)

### What This Means
The model correctly learns bounding box regression (where things are) but fails to learn objectness and class confidence (whether detections are valid). This is a known limitation of training deep learning models with insufficient data.

### Production Requirements
For production-grade accuracy, you need:
- **300+ diverse water damage images** (from different angles, lighting, damage types)
- **Manual annotation** using tools like Roboflow or LabelImg
- **Training time**: 100+ epochs with proper validation
- **Expected accuracy**: 0.7+ mAP50 (vs current ~0.3)

### How to Improve
1. **Collect more images**:
   - Photograph real water damage in various conditions
   - Capture different water leak types (ceiling, wall, floor)
   - Include both positive (damage) and negative (clean) examples

2. **Annotate properly**:
   - Use Roboflow (free tier available): https://roboflow.com
   - Or use LabelImg: https://github.com/heartexlabs/labelImg
   - Draw accurate bounding boxes around damage areas

3. **Retrain the model**:
   ```bash
   python auto_label_water_damage.py  # Auto-label your new images
   npm run train:water-damage          # Train with improved dataset
   ```

---

### System Architecture

**1. ESP32-S3 Sense**
- Captures image snapshots of plumbing/wall regions
- Sends images via HTTP POST to backend server
- Optionally captures sensor data (pressure1, pressure2)

**2. Backend Server (Node.js)**
- Receives image data and metadata
- Runs **YOLOv8 inference** for water damage detection
- Draws rectangles around detected leak areas
- Generates annotated images and sends alerts to user

**3. AI Model (YOLOv8)**
- Detects water damage, stains, wet surfaces
- Returns bounding boxes with confidence scores
- Processes images locally (no external API calls)

**4. User Notification System**
- Displays processed image highlighting leaks
- Shows corresponding pressure data and leak confidence level

---

## Technologies Used
| Layer | Technology | Purpose |
|-------|-------------|----------|
| Hardware | ESP32-S3 Sense | Image capture & Wi-Fi transmission |
| AI/ML | YOLOv8n + ONNX | Local water damage detection |
| Backend | Node.js + Express | API processing, image drawing, WebSocket |
| Image Processing | Sharp + OpenCV | Image preprocessing and annotation |
| Data | JSON / WebSocket | Real-time data exchange |


## Setup & Installation
1. **Clone the Repository**
   ```bash
   git clone https://github.com/ggstephen6724/smart-water-leak-detection.git
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run download:model  # Download YOLOv8n model
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **ESP32 Setup**
   - Flash firmware from `iot/main.ino` using Arduino IDE
   - Update Wi-Fi credentials in config
   - Set backend endpoint URL

5. **Test the System**
   ```bash
   npm run test:archive  # Test on 20 demo images
   ```

## Future Improvements 
- Real-time video stream leak detection
- Edge AI inference using TensorFlow Lite Micro on ESP32
- Integration with mobile app for instant alerts
- Water usage analytics dashboard
- Improved model accuracy with production dataset
- Multi-camera support

## Known Limitations
- **Current model**: Requires 300+ images for production quality
- **Detection confidence**: Currently at 25% threshold (demo status)
- **Processing time**: ~100ms per image on CPU (improvement needed for real-time video)
- **Edge cases**: Limited by training data diversity

## Contributors
- **George Stephen** - System Architecture, Backend API development, Gemini API integration
- **Jerin Mulangan** - YOLOv8 implementation, model training pipeline, auto-labeling, ONNX conversion, debug analysis, demo status documentation

## LICENSE
This project is released under the MIT License. See LICENSE for more information.

