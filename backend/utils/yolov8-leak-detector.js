const ort = require("onnxruntime-node");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// YOLOv8 Nano model configuration for water leak detection
const MODEL_PATH = path.join(__dirname, "../models/yolov8n.onnx");
const INPUT_SIZE = 640; // YOLOv8 standard input size
const CONFIDENCE_THRESHOLD = 0.6; // 60% confidence - filter noise from untrained model
const IOU_THRESHOLD = 0.45; // Non-max suppression IOU threshold

// Custom water damage labels (train on water damage dataset)
const LEAK_CLASSES = {
  0: "water_stain",
  1: "wet_surface",
  2: "mold_growth",
  3: "structural_damage",
  4: "pooling_water",
};

// Fallback to generic COCO classes if needed
const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
  "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis",
  "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard",
  "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife",
  "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
  "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed",
  "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
  "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock",
  "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

let session = null;

/**
 * Downloads YOLOv8n model using Python + Ultralytics (most reliable)
 * Converts from PT format to ONNX using Ultralytics' export pipeline
 * @returns {Promise<void>}
 */
async function downloadModel() {
  return new Promise(async (resolve, reject) => {
    if (fs.existsSync(MODEL_PATH)) {
      const stats = fs.statSync(MODEL_PATH);
      if (stats.size > 1000000) {
        console.log("✅ YOLOv8n ONNX model already exists");
        resolve();
        return;
      } else {
        console.log("⚠️ Existing model file is empty/corrupt, re-downloading...");
        try {
          fs.unlinkSync(MODEL_PATH);
        } catch (e) {}
      }
    }

    console.log("📥 Downloading and converting YOLOv8n to ONNX...");
    const modelDir = path.dirname(MODEL_PATH);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    const { spawn } = require("child_process");
    const pythonScript = path.join(__dirname, "../download_yolov8_model.py");
    
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const python = spawn(pythonCmd, [pythonScript]);

    let stderr = "";
    let stdout = "";

    python.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    python.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      process.stdout.write(output);
    });

    python.on("close", (code) => {
      if (code === 0 && fs.existsSync(MODEL_PATH)) {
        const size = fs.statSync(MODEL_PATH).size;
        if (size > 1000000) {
          console.log("");
          resolve();
          return;
        }
      }
      
      console.log("\n❌ Model download/conversion failed");
      if (stderr.includes("ultralytics")) {
        console.log("\n📌 To fix, install ultralytics:");
        console.log("   pip install ultralytics");
      }
      reject(new Error(`Model download failed with exit code ${code}`));
    });

    python.on("error", (err) => {
      console.log("\n❌ Python not available or error occurred");
      console.log("\n📌 To set up manually:");
      console.log("   1. Install: pip install ultralytics");
      console.log("   2. Run: python download_yolov8_model.py");
      reject(new Error(`Python execution failed: ${err.message}`));
    });
  });
}

/**
 * Loads the YOLOv8n ONNX model session (called once on startup)
 * @returns {Promise<void>}
 */
async function loadModel() {
  try {
    // Ensure model exists
    await downloadModel();

    console.log(`📦 Loading YOLOv8n model from ${MODEL_PATH}...`);
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"],
    });
    console.log("✅ YOLOv8n model loaded successfully!");
  } catch (err) {
    console.error("❌ Failed to load YOLOv8n model:", err.message);
    throw err;
  }
}

/**
 * Preprocesses image buffer for YOLOv8 inference
 * @param {Buffer} imageBuffer - Input image buffer
 * @returns {Promise<Object>} - { tensor, originalSize, letterboxInfo }
 */
async function preprocessImage(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const originalSize = { width: metadata.width, height: metadata.height };

    // Resize with letterboxing (preserve aspect ratio)
    const resized = await image
      .resize(INPUT_SIZE, INPUT_SIZE, {
        fit: "contain",
        background: { r: 114, g: 114, b: 114 },
      })
      .toColorspace('srgb')
      .raw()
      .toBuffer();

    // Normalize to [0, 1] for YOLOv8 (use division by 255)
    const data = new Float32Array(resized.length);
    for (let i = 0; i < resized.length; i += 3) {
      data[i] = resized[i] / 255.0; // R
      data[i + 1] = resized[i + 1] / 255.0; // G
      data[i + 2] = resized[i + 2] / 255.0; // B
    }

    // Create ONNX tensor (1, 3, 640, 640)
    const tensor = new ort.Tensor("float32", data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    return { tensor, originalSize };
  } catch (err) {
    console.error("❌ Error preprocessing image:", err.message);
    throw err;
  }
}

/**
 * Sigmoid activation function
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Decodes YOLOv8 output to bounding boxes and confidence scores
 * YOLOv8 ONNX outputs raw logits: [1, 84, 8400] format
 * @param {Object} outputs - Model output tensors
 * @param {Object} originalSize - Original image dimensions
 * @returns {Array} - Array of { x, y, width, height, confidence, classId }
 */
function decodeOutput(outputs, originalSize) {
  const detections = [];

  try {
    // Get the output tensor
    const output = outputs[Object.keys(outputs)[0]];
    const data = output.data;
    const dims = output.dims;

    console.log(`📊 Output shape: [${dims.join(", ")}]`);

    // YOLOv8 ONNX format: [1, 84, 8400] - transposed
    // Channels: [x, y, w, h, objectness, class0-79]
    const numChannels = dims[1];
    const numDetections = dims[2];

    console.log(`✅ Processing ${numDetections} detections with ${numChannels} channels`);

    let detectionCount = 0;

    // Process each detection
    for (let i = 0; i < numDetections; i++) {
      // Extract values from transposed format [1, 84, 8400]
      const xCenter = data[0 * numDetections + i];
      const yCenter = data[1 * numDetections + i];
      const width = data[2 * numDetections + i];
      const height = data[3 * numDetections + i];
      
      // Objectness is raw logit, needs sigmoid
      const objectnessLogit = data[4 * numDetections + i];
      const objectness = sigmoid(objectnessLogit);

      // Find class with highest confidence
      let maxConfidence = 0;
      let classId = 0;
      
      // Classes start at channel 5, go through 84 (so 80 classes)
      for (let c = 0; c < 80; c++) {
        const channelIdx = 5 + c;
        if (channelIdx >= numChannels) break;
        
        const classLogit = data[channelIdx * numDetections + i];
        const classConf = sigmoid(classLogit);
        
        if (classConf > maxConfidence) {
          maxConfidence = classConf;
          classId = c;
        }
      }

      // Combine objectness and class confidence
      const combinedConfidence = objectness * maxConfidence;

      // Log some detections for debugging
      if (i < 5) {
        console.log(`  Sample ${i}: obj=${objectness.toFixed(3)}, class=${classId}, conf=${combinedConfidence.toFixed(3)}`);
      }

      // Use higher threshold to filter noise
      if (combinedConfidence >= 0.6) {
        detectionCount++;

        // Scale coordinates back to original image size
        const scaleX = originalSize.width / INPUT_SIZE;
        const scaleY = originalSize.height / INPUT_SIZE;

        detections.push({
          x: Math.max(0, Math.round((xCenter - width / 2) * scaleX)),
          y: Math.max(0, Math.round((yCenter - height / 2) * scaleY)),
          width: Math.round(width * scaleX),
          height: Math.round(height * scaleY),
          confidence: (combinedConfidence * 100).toFixed(1),
          classId,
        });
      }
    }

    console.log(`✅ Total detections after filtering (conf >= 0.6): ${detectionCount}`);
  } catch (err) {
    console.error("❌ Error decoding YOLOv8 output:", err.message);
  }

  return detections;
}

/**
 * Non-Maximum Suppression to remove duplicate detections
 * @param {Array} detections - Array of detected boxes
 * @param {number} iouThreshold - IOU threshold for suppression
 * @returns {Array} - Filtered detections
 */
function nonMaxSuppression(detections, iouThreshold = IOU_THRESHOLD) {
  if (detections.length === 0) return [];

  // Sort by confidence descending
  detections.sort((a, b) => b.confidence - a.confidence);

  const keep = [];
  const suppressed = new Set();

  for (let i = 0; i < detections.length; i++) {
    if (suppressed.has(i)) continue;

    keep.push(detections[i]);

    const box1 = detections[i];
    const x1_min = box1.x;
    const y1_min = box1.y;
    const x1_max = box1.x + box1.width;
    const y1_max = box1.y + box1.height;

    for (let j = i + 1; j < detections.length; j++) {
      if (suppressed.has(j)) continue;

      const box2 = detections[j];
      const x2_min = box2.x;
      const y2_min = box2.y;
      const x2_max = box2.x + box2.width;
      const y2_max = box2.y + box2.height;

      // Calculate IOU
      const intersectX1 = Math.max(x1_min, x2_min);
      const intersectY1 = Math.max(y1_min, y2_min);
      const intersectX2 = Math.min(x1_max, x2_max);
      const intersectY2 = Math.min(y1_max, y2_max);

      const intersectArea =
        Math.max(0, intersectX2 - intersectX1) * Math.max(0, intersectY2 - intersectY1);

      const box1Area = box1.width * box1.height;
      const box2Area = box2.width * box2.height;
      const unionArea = box1Area + box2Area - intersectArea;

      const iou = intersectArea / unionArea;

      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return keep;
}

/**
 * Analyzes image for water leaks using local YOLOv8n model
 * @param {Buffer} imageBuffer - Image buffer (JPEG or PNG)
 * @param {number} end1Pressure - Pressure reading from end 1 (optional)
 * @param {number} end2Pressure - Pressure reading from end 2 (optional)
 * @returns {Promise<string>} - Annotated image as base64 string
 */
async function analyzeWithYOLOv8(imageBuffer, end1Pressure = null, end2Pressure = null) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error("No image buffer provided!");
  }

  if (!session) {
    throw new Error("YOLOv8n model not loaded. Call loadModel() first.");
  }

  try {
    console.log("🔍 Starting YOLOv8n inference for leak detection...");

    // Log pressure context if available
    if (end1Pressure !== null && end2Pressure !== null) {
      const pressureDiff = Math.abs(end1Pressure - end2Pressure);
      console.log(`📊 Pressure context: End1=${end1Pressure} PSI, End2=${end2Pressure} PSI, Diff=${pressureDiff.toFixed(2)} PSI`);
    }

    // Preprocess image
    const { tensor, originalSize } = await preprocessImage(imageBuffer);

    // Run inference
    console.log("⚙️ Running YOLOv8n model...");
    const outputs = await session.run({ images: tensor });

    // Decode detections
    const allDetections = decodeOutput(outputs, originalSize);
    console.log(`📊 Raw detections: ${allDetections.length}`);

    // Apply NMS
    const detections = nonMaxSuppression(allDetections);
    console.log(`✅ After NMS: ${detections.length} detection(s)`);

    if (detections.length > 0) {
      detections.forEach((det, i) => {
        const className = COCO_CLASSES[det.classId] || `Class ${det.classId}`;
        console.log(`   ${i + 1}. ${className} - Confidence: ${det.confidence}%`);
        console.log(`      Box: (${det.x}, ${det.y}) ${det.width}x${det.height}`);
      });
    } else {
      console.log("✅ No objects detected - image appears clean!");
    }

    // Draw annotations on detected objects
    const annotatedImage = await drawAnnotations(imageBuffer, detections, originalSize);
    return annotatedImage.toString("base64");
  } catch (err) {
    console.error("❌ Error in YOLOv8n analysis:", err.message);
    return imageBuffer.toString("base64");
  }
}

/**
 * Draws bounding boxes and labels on image
 * @param {Buffer} imageBuffer - Original image
 * @param {Array} detections - Array of detections from YOLOv8
 * @param {Object} originalSize - Original image dimensions
 * @returns {Promise<Buffer>} - Annotated image buffer
 */
async function drawAnnotations(imageBuffer, detections, originalSize) {
  try {
    const image = sharp(imageBuffer);

    console.log(`📐 Annotating image (${originalSize.width}x${originalSize.height})...`);

    if (detections.length === 0) {
      console.log("✅ No detections to annotate - returning original image.");
      return imageBuffer;
    }

    // Create SVG overlay with bounding boxes
    const svgElements = detections.map((det, index) => {
      const className = COCO_CLASSES[det.classId] || `Class ${det.classId}`;
      const label = `${className} ${det.confidence}%`;

      // Position label above box
      const labelY = det.y > 25 ? det.y - 8 : det.y + det.height + 20;

      // Use bright green for visibility
      return `
        <!-- Bounding box -->
        <rect 
          x="${det.x}" 
          y="${det.y}" 
          width="${det.width}" 
          height="${det.height}" 
          fill="none" 
          stroke="#00FF00" 
          stroke-width="3"
        />
        <!-- Label background -->
        <rect 
          x="${det.x}" 
          y="${labelY - 20}" 
          width="${Math.max(label.length * 8, 80)}" 
          height="20" 
          fill="#00FF00" 
          opacity="0.9"
        />
        <!-- Label text -->
        <text 
          x="${det.x + 4}" 
          y="${labelY - 6}" 
          font-family="Arial, sans-serif" 
          font-size="12" 
          fill="black" 
          font-weight="bold"
        >${label}</text>
      `;
    }).join("");

    const svgOverlay = `
      <svg width="${originalSize.width}" height="${originalSize.height}">
        ${svgElements}
      </svg>
    `;

    // Composite SVG overlay on original image
    const annotatedBuffer = await image
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      }])
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log(`✅ Successfully annotated image with ${detections.length} detection(s)`);
    return annotatedBuffer;
  } catch (err) {
    console.error("❌ Error drawing annotations:", err.message);
    return imageBuffer;
  }
}

module.exports = {
  loadModel,
  downloadModel,
  analyzeWithYOLOv8,
};
