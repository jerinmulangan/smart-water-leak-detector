require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const { loadModel, analyzeWithYOLOv8 } = require("./utils/yolov8-leak-detector");


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Multer config for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// WebSocket setup
const server = app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await loadModel();
  } catch (err) {
    console.error("Failed to load YOLO model on startup:", err.message);
    process.exit(1);
  }
});
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", (err) => console.error("WebSocket error:", err));
});

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

// Test endpoint for image analysis using local YOLO
app.post("/api/analyze-leak", upload.single("image"), async (req, res) => {
  try {
    const { end1Pressure, end2Pressure, userEmail } = req.body;

    // Use test image if none uploaded
    const imageBuffer = req.file?.buffer || fs.readFileSync("./test_images/test2.png");

    if (!end1Pressure || !end2Pressure || !userEmail) {
      return res.status(400).send({ message: "Provide end1Pressure, end2Pressure, and userEmail" });
    }

    // Analyze with local YOLOv8 model
    const annotatedBase64 = await analyzeWithYOLOv8(imageBuffer, end1Pressure, end2Pressure);

    // Broadcast over WebSocket
    broadcast({
      type: "yolov8-detection",
      annotatedImage: annotatedBase64,
      end1Pressure,
      end2Pressure,
      dateTime: new Date().toISOString(),
    });

    // Send email with annotated image
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "FlowGuardian Leak Analysis (YOLOv8 Detection)",
      html: `
        <h2>Leak Analysis Complete (Local YOLOv8 AI)</h2>
        <p>Pressure readings:</p>
        <ul>
          <li>End1: ${end1Pressure} PSI</li>
          <li>End2: ${end2Pressure} PSI</li>
        </ul>
        <p>Annotated image with detected objects attached below.</p>
      `,
      attachments: [
        {
          filename: "leak_analysis_yolov8.png",
          content: Buffer.from(annotatedBase64, "base64"),
          contentType: "image/png",
        },
      ],
    });

    res.status(200).send({ message: "YOLO analysis complete, email sent!" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send({ message: "Leak analysis failed", error: err.message });
  }
});

// --- Optional pressure-only endpoint ---
app.post("/api/pressure", (req, res) => {
  const { end1Pressure, end2Pressure } = req.body;
  if (end1Pressure == null || end2Pressure == null)
    return res.status(400).send({ message: "Provide end1Pressure and end2Pressure" });

  const pressureDiff = Math.abs(end1Pressure - end2Pressure);
  broadcast({ type: "pressure", end1Pressure, end2Pressure, dateTime: new Date().toISOString() });

  res.send({ message: "Pressure received", pressureDiff });
});
