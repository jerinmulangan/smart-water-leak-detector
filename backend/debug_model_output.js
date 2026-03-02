/**
 * Debug script to analyze model output confidence distribution
 */

const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ort = require("onnxruntime-node");

const MODEL_PATH = path.join(__dirname, "models/yolov8n_water_damage.onnx");

async function analyzeModelOutput() {
  console.log("🔍 Analyzing YOLOv8 model output distribution...\n");

  // Load model
  const session = await ort.InferenceSession.create(MODEL_PATH);
  console.log("✅ Model loaded\n");

  // Test on first image
  const imagePath = path.join(__dirname, "../archive/waterleak1.jpeg");
  const imageBuffer = fs.readFileSync(imagePath);

  // Preprocess
  const img = sharp(imageBuffer);
  const resized = await img.resize(640, 640, { fit: "fill" }).toBuffer();

  // Create tensor
  const data = new Float32Array(640 * 640 * 3);
  for (let i = 0; i < resized.length; i += 3) {
    data[i / 3 * 3] = resized[i] / 255;           // R
    data[i / 3 * 3 + 1] = resized[i + 1] / 255;  // G
    data[i / 3 * 3 + 2] = resized[i + 2] / 255;  // B
  }

  const tensor = new ort.Tensor("float32", data, [1, 3, 640, 640]);
  const feeds = { images: tensor };

  // Run inference
  const outputData = await session.run(feeds);
  const output = outputData.output0.data;

  console.log("📊 Output shape:", outputData.output0.dims);
  console.log("📊 Output data type:", outputData.output0.type);
  console.log("📊 Total values:", output.length);

  // Analyze confidence scores
  const [batch, channels, positions] = outputData.output0.dims;
  console.log(`\n📈 Analyzing ${channels} channels × ${positions} positions\n`);

  // Extract objectness scores (first channel in raw ONNX output)
  const objectnessScores = [];
  for (let i = 0; i < positions; i++) {
    // Raw logits before sigmoid
    const rawLogit = output[i]; // Channel 0 is objectness
    const sigmoid = 1 / (1 + Math.exp(-rawLogit));
    objectnessScores.push({ raw: rawLogit, sigmoid });
  }

  // Sort and analyze
  objectnessScores.sort((a, b) => b.sigmoid - a.sigmoid);

  console.log("Top 20 objectness scores:");
  console.log("Rank | Raw Logit | Sigmoid (after activation)");
  console.log("-----|-----------|------------------------");
  for (let i = 0; i < 20; i++) {
    const score = objectnessScores[i];
    console.log(
      `${String(i + 1).padStart(4)} | ${score.raw.toFixed(6).padStart(9)} | ${score.sigmoid.toFixed(6)}`
    );
  }

  // Distribution analysis
  const buckets = {
    "0.0-0.1": 0,
    "0.1-0.2": 0,
    "0.2-0.3": 0,
    "0.3-0.4": 0,
    "0.4-0.5": 0,
    "0.5-0.6": 0,
    "0.6-0.7": 0,
    "0.7-0.8": 0,
    "0.8-0.9": 0,
    "0.9-1.0": 0,
  };

  objectnessScores.forEach((score) => {
    const sig = score.sigmoid;
    if (sig < 0.1) buckets["0.0-0.1"]++;
    else if (sig < 0.2) buckets["0.1-0.2"]++;
    else if (sig < 0.3) buckets["0.2-0.3"]++;
    else if (sig < 0.4) buckets["0.3-0.4"]++;
    else if (sig < 0.5) buckets["0.4-0.5"]++;
    else if (sig < 0.6) buckets["0.5-0.6"]++;
    else if (sig < 0.7) buckets["0.6-0.7"]++;
    else if (sig < 0.8) buckets["0.7-0.8"]++;
    else if (sig < 0.9) buckets["0.8-0.9"]++;
    else buckets["0.9-1.0"]++;
  });

  console.log("\n📊 Confidence distribution:");
  console.log("Range      | Count");
  console.log("-----------|-------");
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = ((count / positions) * 100).toFixed(1);
    console.log(`${range.padEnd(10)} | ${count.toString().padStart(5)} (${pct.padStart(5)}%)`);
  });

  const avgConfidence = objectnessScores.reduce((sum, s) => sum + s.sigmoid, 0) / objectnessScores.length;
  const maxConfidence = objectnessScores[0].sigmoid;
  console.log(`\n📈 Average confidence: ${avgConfidence.toFixed(4)}`);
  console.log(`📈 Max confidence: ${maxConfidence.toFixed(4)}`);

  // Recommendation
  console.log("\n💡 Recommendations:");
  if (maxConfidence < 0.3) {
    console.log("   ❌ Model confidence is very low - not learning well");
    console.log("   💾 With only 20 images, the model cannot learn effectively");
    console.log("   📌 Try: Lower threshold to 0.1-0.2 for any detections");
  } else if (maxConfidence < 0.5) {
    console.log("   ⚠️  Model confidence is low");
    console.log("   📌 Try: Lower threshold to 0.2-0.3");
  } else {
    console.log("   ✅ Model confidence looks reasonable");
    console.log("   📌 Try: Keep threshold at 0.5");
  }
}

analyzeModelOutput().catch(console.error);
