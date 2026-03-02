/**
 * Model configuration manager
 * Switch between generic YOLOv8 and custom water damage model
 */

const path = require("path");
const fs = require("fs");

// Define available models
const MODELS = {
  GENERIC: {
    id: "generic",
    name: "YOLOv8n (Generic - COCO 80 classes)",
    path: "models/yolov8n.onnx",
    description: "General object detection. Detects chairs, boats, bicycles, etc.",
    classes: "COCO_80",
    training: "None (pre-trained on COCO dataset)",
    confidence_threshold: 0.6,
    suitable_for: ["generic objects"],
    notes: "❌ WILL NOT DETECT WATER LEAKS - use custom model instead"
  },
  
  WATER_DAMAGE: {
    id: "water_damage",
    name: "YOLOv8n Water Damage (Custom Trained)",
    path: "models/yolov8n_water_damage.onnx",
    description: "Trained specifically for water damage detection.",
    classes: {
      0: "water_stain",
      1: "wet_surface",
      2: "mold_growth",
      3: "structural_damage",
      4: "pooling_water"
    },
    training: "Fine-tuned on water leak images from archive",
    confidence_threshold: 0.5,
    suitable_for: ["water damage", "leaks", "wet surfaces", "mold"],
    notes: "✅ RECOMMENDED for water leak detector"
  }
};

/**
 * Get the active model configuration
 * @returns {Object} Active model config
 */
function getActiveModel() {
  const modelPath = path.join(__dirname, MODELS.WATER_DAMAGE.path);
  
  // If custom model exists, use it; otherwise fall back to generic
  if (fs.existsSync(modelPath)) {
    console.log("✅ Using custom water damage model");
    return MODELS.WATER_DAMAGE;
  } else {
    console.log("⚠️  Custom model not found. Using generic YOLOv8n");
    console.log("   Run: npm run train:water-damage");
    return MODELS.GENERIC;
  }
}

/**
 * Get full path to model file
 * @returns {string} Absolute path to ONNX model
 */
function getModelPath() {
  const config = getActiveModel();
  return path.join(__dirname, config.path);
}

/**
 * Get confidence threshold for active model
 * @returns {number} Confidence threshold (0-1)
 */
function getConfidenceThreshold() {
  const config = getActiveModel();
  return config.confidence_threshold;
}

/**
 * Get class labels for active model
 * @returns {Object|string} Class labels
 */
function getClasses() {
  const config = getActiveModel();
  
  if (config.id === "water_damage") {
    return config.classes;
  } else {
    // Return COCO 80 classes
    return {
      0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 4: "airplane",
      5: "bus", 6: "train", 7: "truck", 8: "boat", 9: "traffic light",
      10: "fire hydrant", 11: "stop sign", 12: "parking meter", 13: "bench",
      14: "cat", 15: "dog", 16: "horse", 17: "sheep", 18: "cow", 19: "elephant",
      20: "bear", 21: "zebra", 22: "giraffe", 23: "backpack", 24: "umbrella",
      25: "handbag", 26: "tie", 27: "suitcase", 28: "frisbee", 29: "skis",
      30: "snowboard", 31: "sports ball", 32: "kite", 33: "baseball bat",
      34: "baseball glove", 35: "skateboard", 36: "surfboard", 37: "tennis racket",
      38: "bottle", 39: "wine glass", 40: "cup", 41: "fork", 42: "knife",
      43: "spoon", 44: "bowl", 45: "banana", 46: "apple", 47: "sandwich",
      48: "orange", 49: "broccoli", 50: "carrot", 51: "hot dog", 52: "pizza",
      53: "donut", 54: "cake", 55: "chair", 56: "couch", 57: "potted plant",
      58: "bed", 59: "dining table", 60: "toilet", 61: "tv", 62: "laptop",
      63: "mouse", 64: "remote", 65: "keyboard", 66: "microwave", 67: "oven",
      68: "toaster", 69: "sink", 70: "refrigerator", 71: "book", 72: "clock",
      73: "vase", 74: "scissors", 75: "teddy bear", 76: "hair drier", 77: "toothbrush"
    };
  }
}

/**
 * Print model information
 */
function printModelInfo() {
  const config = getActiveModel();
  console.log("\n📊 Model Configuration:");
  console.log(`   Model: ${config.name}`);
  console.log(`   Path: ${config.path}`);
  console.log(`   Confidence Threshold: ${config.confidence_threshold}`);
  console.log(`   Training: ${config.training}`);
  console.log(`   Suitable for: ${config.suitable_for.join(", ")}`);
  if (config.notes) {
    console.log(`   Note: ${config.notes}`);
  }
  console.log();
}

/**
 * Print all available models
 */
function listModels() {
  console.log("\n📋 Available Models:\n");
  
  Object.values(MODELS).forEach((model, idx) => {
    const modelPath = path.join(__dirname, model.path);
    const exists = fs.existsSync(modelPath) ? "✅ INSTALLED" : "❌ NOT INSTALLED";
    
    console.log(`${idx + 1}. ${model.name}`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Status: ${exists}`);
    console.log(`   Description: ${model.description}`);
    console.log(`   Confidence Threshold: ${model.confidence_threshold}`);
    console.log(`   Suitable for: ${model.suitable_for.join(", ")}`);
    console.log();
  });
}

/**
 * Get training instructions
 */
function getTrainingInstructions() {
  return `
📚 TRAINING INSTRUCTIONS:

To train a custom water damage model:

  1. Ensure your water leak images are in:
     backend/archive/

  2. (Optional but recommended) Manually annotate images using:
     - Roboflow: https://roboflow.com
     - LabelImg: https://github.com/heartexlabs/labelImg
     - Export in YOLO format to backend/data/water_damage/images/train/ and /val/

  3. Run the training script:
     npm run train:water-damage

  4. After training completes, the custom model will be saved to:
     backend/models/yolov8n_water_damage.onnx

  5. This script will automatically detect and use the custom model
     for all future inferences.

⏱️  Training time: ~5-10 minutes on CPU, ~1-2 minutes on GPU

📊 For production results, collect 300-500+ diverse water leak images
   with proper bounding box annotations.
`;
}

module.exports = {
  MODELS,
  getActiveModel,
  getModelPath,
  getConfidenceThreshold,
  getClasses,
  printModelInfo,
  listModels,
  getTrainingInstructions
};
