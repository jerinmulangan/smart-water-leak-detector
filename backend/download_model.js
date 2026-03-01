#!/usr/bin/env node

/**
 * Download YOLOv5n ONNX model from Ultralytics raw GitHub
 * More reliable than HuggingFace CDN
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const MODEL_URL = "https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.onnx";
const MODEL_DIR = path.join(__dirname, "models");
const MODEL_PATH = path.join(MODEL_DIR, "yolov7-tiny.onnx");

// Ensure models directory exists
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// Check if model already exists
if (fs.existsSync(MODEL_PATH)) {
  const stats = fs.statSync(MODEL_PATH);
  if (stats.size > 1000000) { // At least 1MB
    console.log("✅ YOLOv7-tiny model already exists at", MODEL_PATH);
    process.exit(0);
  } else {
    console.log("⚠️ Corrupted model file, re-downloading...");
    fs.unlinkSync(MODEL_PATH);
  }
}

console.log("📦 Downloading YOLOv7-tiny ONNX model...");
console.log("URL:", MODEL_URL);
console.log("Saving to:", MODEL_PATH);

const file = fs.createWriteStream(MODEL_PATH);
let downloadedBytes = 0;
let totalBytes = 0;

https
  .get(MODEL_URL, { timeout: 90000 }, (response) => {
    if (response.statusCode !== 200) {
      file.destroy();
      fs.unlinkSync(MODEL_PATH);
      console.error(`\n❌ HTTP ${response.statusCode} - Download failed`);
      process.exit(1);
    }

    totalBytes = parseInt(response.headers["content-length"], 10) || 0;

    response.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\r⬇️ Downloading: ${percent}% (${downloadedBytes} / ${totalBytes} bytes)`);
      } else {
        process.stdout.write(`\r⬇️ Downloading: ${downloadedBytes} bytes`);
      }
    });

    response.pipe(file);
  })
  .on("error", (err) => {
    file.destroy();
    fs.unlinkSync(MODEL_PATH);
    console.error(`\n❌ Download error: ${err.message}`);
    process.exit(1);
  });

file.on("finish", () => {
  file.close();
  const stats = fs.statSync(MODEL_PATH);
  if (stats.size < 1000000) {
    console.error(`\n❌ Downloaded file too small (${stats.size} bytes)`);
    fs.unlinkSync(MODEL_PATH);
    process.exit(1);
  } else {
    console.log(`\n✅ Model downloaded successfully! (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
    console.log("Location:", MODEL_PATH);
    process.exit(0);
  }
});

file.on("error", (err) => {
  fs.unlinkSync(MODEL_PATH);
  console.error(`\n❌ File write error: ${err.message}`);
  process.exit(1);
});
