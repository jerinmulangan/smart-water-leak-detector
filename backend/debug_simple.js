/**
 * Simple test to debug what the model actually outputs
 */

const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ort = require("onnxruntime-node");

const MODEL_PATH = path.join(__dirname, "models/yolov8n_water_damage.onnx");
const INPUT_SIZE = 640;

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

async function testModelOutput() {
  console.log("📋 Testing model output on one image...\n");

  // Load model
  const session = await ort.InferenceSession.create(MODEL_PATH);
  console.log("✅ Model loaded\n");

  // Load first test image
  const imagePath = path.join(__dirname, "../archive/waterleak1.jpeg");
  const imageBuffer = fs.readFileSync(imagePath);

  // Preprocess
  const img = sharp(imageBuffer);
  const resized = await img.resize(640, 640, { fit: "fill" }).toBuffer();

  // Create tensor
  const data = new Float32Array(640 * 640 * 3);
  for (let i = 0; i < resized.length; i += 3) {
    data[(i / 3) * 3] = resized[i] / 255;
    data[(i / 3) * 3 + 1] = resized[i + 1] / 255;
    data[(i / 3) * 3 + 2] = resized[i + 2] / 255;
  }

  const tensor = new ort.Tensor("float32", data, [1, 3, 640, 640]);
  const feeds = { images: tensor };

  // Run inference
  const outputData = await session.run(feeds);
  const output = outputData.output0;
  const outputRaw = output.data;
  const dims = output.dims;

  const [batch, channels, positions] = dims;
  console.log(`📊 Output shape: [${dims.join(", ")}]`);
  console.log(`📊 Channels: ${channels} (4 bbox + 1 obj + ${channels - 5} classes)\n`);

  // Check what values we're actually getting
  console.log("🔍 Sampling raw output values:\n");

  for (let pos = 0; pos < 10; pos++) {
    console.log(`Position ${pos}:`);
    for (let ch = 0; ch < Math.min(9, channels); ch++) {
      const idx = ch * positions + pos;
      const rawVal = outputRaw[idx];
      const sigVal = sigmoid(rawVal);
      console.log(
        `  Ch ${ch}: raw=${rawVal.toFixed(4).padStart(8)} → sigmoid=${sigVal.toFixed(6)}`
      );
    }
    console.log();
  }

  // Check detection count with different thresholds
  console.log("\n📊 Detection counts by confidence threshold:\n");
  const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  for (const thresh of thresholds) {
    let count = 0;
    for (let i = 0; i < positions; i++) {
      const objLogit = outputRaw[4 * positions + i];
      const objSigmoid = sigmoid(objLogit);
      if (objSigmoid >= thresh) {
        count++;
      }
    }
    console.log(
      `Threshold ${thresh.toFixed(1)}: ${count} detections (${((count / positions) * 100).toFixed(2)}%)`
    );
  }
}

testModelOutput().catch(console.error);
