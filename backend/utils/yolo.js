const ort = require("onnxruntime-node");
const sharp = require("sharp");
const path = require("path");

// YOLOv7-tiny model configuration
const MODEL_PATH = path.join(__dirname, "../models/yolov7-tiny.onnx");
const INPUT_SIZE = 640; // Standard YOLO input size
const CONFIDENCE_THRESHOLD = 0.4; // Filter detections below 40% confidence
const IOU_THRESHOLD = 0.45; // Non-max suppression IOU threshold

let session = null;

/**
 * Loads the YOLOv7-tiny ONNX model session (called once on startup)
 * @returns {Promise<void>}
 */
async function loadModel() {
  try {
    console.log(`📦 Loading YOLOv7-tiny model from ${MODEL_PATH}...`);
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"], // Use CPU; swap to ["cuda"] if GPU available
    });
    console.log("✅ YOLOv7-tiny model loaded successfully!");
  } catch (err) {
    console.error("❌ Failed to load YOLOv7-tiny model:", err.message);
    throw err;
  }
}

/**
 * Preprocesses image buffer for YOLO inference
 * @param {Buffer} imageBuffer - Input image buffer
 * @returns {Promise<Object>} - { tensor, originalSize }
 */
async function preprocessImage(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const originalSize = { width: metadata.width, height: metadata.height };

    // Resize to INPUT_SIZE x INPUT_SIZE with letterboxing (preserve aspect ratio)
    const resized = await image
      .resize(INPUT_SIZE, INPUT_SIZE, {
        fit: "contain",
        background: { r: 114, g: 114, b: 114 }, // YOLO default gray background
      })
      .raw()
      .toBuffer({ info: true });

    // Normalize to [0, 1] and create tensor (RGB format)
    const data = new Float32Array(resized.data.length);
    for (let i = 0; i < resized.data.length; i += 3) {
      data[i] = resized.data[i] / 255.0; // R
      data[i + 1] = resized.data[i + 1] / 255.0; // G
      data[i + 2] = resized.data[i + 2] / 255.0; // B
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
 * Decodes YOLOv7 output to bounding boxes and confidence scores
 * @param {Object} outputs - Model output tensors
 * @param {Object} originalSize - Original image dimensions
 * @returns {Array} - Array of { x, y, width, height, confidence, classId }
 */
function decodeOutput(outputs, originalSize) {
  const detections = [];
  
  try {
    // YOLOv7 output format: [1, 25200, 85] similar to YOLOv5
    const output = outputs[0];
    const data = output.data;
    const [batchSize, numDetections, numOutputs] = output.dims;
    
    // Process each detection
    for (let i = 0; i < numDetections; i++) {
      const offset = i * numOutputs;
      const xCenter = data[offset];
      const yCenter = data[offset + 1];
      const width = data[offset + 2];
      const height = data[offset + 3];
      const objectness = data[offset + 4];
      
      // Find class with highest confidence
      let maxConfidence = 0;
      let classId = 0;
      for (let c = 0; c < 80; c++) {
        const conf = data[offset + 5 + c];
        if (conf > maxConfidence) {
          maxConfidence = conf;
          classId = c;
        }
      }
      
      // Combine objectness and class confidence
      const combinedConfidence = objectness * maxConfidence;
      
      // Filter by confidence threshold
      if (combinedConfidence >= CONFIDENCE_THRESHOLD) {
        detections.push({
          x: Math.max(0, Math.round(xCenter - width / 2)),
          y: Math.max(0, Math.round(yCenter - height / 2)),
          width: Math.round(width),
          height: Math.round(height),
          confidence: (combinedConfidence * 100).toFixed(1),
          classId,
        });
      }
    }
  } catch (err) {
    console.error("❌ Error decoding YOLOv7 output:", err.message);
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
 * Analyzes image for objects using local YOLOv7-tiny model
 * @param {Buffer} imageBuffer - Image buffer (JPEG or PNG)
 * @param {number} end1Pressure - Pressure reading from end 1 (optional, for context)
 * @param {number} end2Pressure - Pressure reading from end 2 (optional, for context)
 * @returns {Promise<string>} - Annotated image as base64 string
 */
async function analyzeWithYOLO(imageBuffer, end1Pressure = null, end2Pressure = null) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error("No image buffer provided!");
  }

  if (!session) {
    throw new Error("YOLOv7-tiny model not loaded. Call loadModel() first.");
  }

  try {
    console.log("🔍 Starting YOLOv7-tiny inference...");
    
    // Preprocess image
    const { tensor, originalSize } = await preprocessImage(imageBuffer);
    
    // Run inference
    console.log("⚙️ Running YOLOv7-tiny model...");
    const outputs = await session.run({ images: tensor });
    
    // Decode detections
    const allDetections = decodeOutput(outputs, originalSize);
    console.log(`📊 Raw detections: ${allDetections.length}`);
    
    // Apply NMS
    const detections = nonMaxSuppression(allDetections);
    console.log(`✅ After NMS: ${detections.length} detection(s)`);
    
    if (detections.length > 0) {
      detections.forEach((det, i) => {
        console.log(`   ${i + 1}. Class ${det.classId} - Confidence: ${det.confidence}%`);
        console.log(`      Box: (${det.x}, ${det.y}) ${det.width}x${det.height}`);
      });
    }
    
    // Draw annotations on detected objects
    const annotatedImage = await drawAnnotations(imageBuffer, detections, originalSize);
    return annotatedImage.toString("base64");
  } catch (err) {
    console.error("❌ Error in YOLOv7-tiny analysis:", err.message);
    return imageBuffer.toString("base64");
  }
}

/**
 * Draws bounding boxes and labels on image
 * @param {Buffer} imageBuffer - Original image
 * @param {Array} detections - Array of detections from YOLO
 * @param {Object} originalSize - Original image dimensions
 * @returns {Promise<Buffer>} - Annotated image buffer
 */
async function drawAnnotations(imageBuffer, detections, originalSize) {
  try {
    const image = sharp(imageBuffer);
    
    console.log(`📐 Annotating image (${originalSize.width}x${originalSize.height})...`);
    
    // COCO class names (subset for common leak-related objects)
    const classNames = [
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
    
    if (detections.length === 0) {
      console.log("✅ No objects detected - returning original image.");
      return imageBuffer;
    }
    
    // Create SVG overlay with bounding boxes
    const svgElements = detections.map((det, index) => {
      const className = classNames[det.classId] || `Class ${det.classId}`;
      const label = `${className} ${det.confidence}%`;
      
      // Position label above box
      const labelY = det.y > 25 ? det.y - 8 : det.y + det.height + 20;
      
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
          opacity="0.8"
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
  analyzeWithYOLO,
};
