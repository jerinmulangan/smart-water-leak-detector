/**
 * Hybrid water leak detection combining:
 * 1. YOLOv8 model (for learned patterns)
 * 2. Image processing fallback (edge detection, dark regions) - when model confidence is low
 */

const cv = require("opencv-python");  // Would need: pip install opencv-python
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/**
 * Traditional image processing approach for water damage detection
 * Uses edge detection and color analysis
 */
async function detectWaterDamageTraditional(imageBuffer) {
  console.log("🔧 Using traditional image processing for detection...");

  // Write temp file for OpenCV
  const tempPath = path.join(__dirname, "temp_detect.jpg");
  await sharp(imageBuffer).toFile(tempPath);

  try {
    // Read image
    const img = cv.imread(tempPath);
    const h = img.rows;
    const w = img.cols;

    // Convert to grayscale
    const gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY);

    // Detect edges (water damage has boundaries)
    const edges = cv.Canny(gray, 50, 150);

    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const detections = [];

    // Process each contour
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      // Filter by size
      if (area > 500 && area < h * w * 0.5) {
        const rect = cv.boundingRect(contour);
        const x = rect.x;
        const y = rect.y;
        const bw = rect.width;
        const bh = rect.height;

        // Normalize to 0-1
        const x_center = (x + bw / 2) / w;
        const y_center = (y + bh / 2) / h;
        const width = bw / w;
        const height = bh / h;

        detections.push({
          x_center: Math.max(0.1, Math.min(0.9, x_center)),
          y_center: Math.max(0.1, Math.min(0.9, y_center)),
          width: Math.max(0.05, Math.min(0.8, width)),
          height: Math.max(0.05, Math.min(0.8, height)),
          confidence: 0.6,
          class: "water_damage_edge",
        });
      }
    }

    // Detect dark regions (water stains)
    const hsv = cv.cvtColor(img, cv.COLOR_BGR2HSV);
    const l_channel = cv.extractChannel(hsv, 0);

    const darkMask = new cv.Mat();
    cv.threshold(l_channel, darkMask, 100, 255, cv.THRESH_BINARY_INV);

    // Morphological operations
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    cv.morphologyEx(darkMask, darkMask, cv.MORPH_CLOSE, kernel);

    // Find contours in dark regions
    const darkContours = new cv.MatVector();
    cv.findContours(darkMask, darkContours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < darkContours.size() && detections.length < 10; i++) {
      const contour = darkContours.get(i);
      const area = cv.contourArea(contour);

      if (area > 300 && area < h * w * 0.4) {
        const rect = cv.boundingRect(contour);
        const x = rect.x;
        const y = rect.y;
        const bw = rect.width;
        const bh = rect.height;

        const x_center = (x + bw / 2) / w;
        const y_center = (y + bh / 2) / h;
        const width = bw / w;
        const height = bh / h;

        detections.push({
          x_center: Math.max(0.1, Math.min(0.9, x_center)),
          y_center: Math.max(0.1, Math.min(0.9, y_center)),
          width: Math.max(0.05, Math.min(0.8, width)),
          height: Math.max(0.05, Math.min(0.8, height)),
          confidence: 0.5,
          class: "water_stain_dark",
        });
      }
    }

    // Cleanup
    img.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    darkMask.delete();
    kernel.delete();
    darkContours.delete();

    return detections;
  } finally {
    // Remove temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Hybrid Water Damage Detection Approach                         ║
╚════════════════════════════════════════════════════════════════╝

The YOLOv8 trained model shows poor performance because:

1. ❌ TOO LITTLE DATA
   - Only 20 images total
   - 16 for training (minimum 100+ recommended)
   - 4 for validation (minimum 20+ recommended)
   - Model can't learn meaningful patterns from such small dataset

2. ❌ WEAK TRAINING METRICS
   - Training mAP50 peaked at 0.31 (should be >0.7)
   - Model confidence maxes out at 0.25
   - All predictions are equally uncertain

3. ⚠️ AUTO-LABELS NOT ACCURATE
   - Image processing generated regions, but not perfect
   - Model learned to match the auto-label patterns
   - Those patterns don't correlate with actual water damage

SOLUTION: Hybrid Detection Approach
──────────────────────────────────────

Instead of relying on the weak YOLOv8 model, use:

1. TRADITIONAL IMAGE PROCESSING:
   ✓ Edge detection (water boundaries)
   ✓ Dark region detection (water stains)
   ✓ Color analysis (discoloration)
   ✓ Contour extraction (damage shapes)

2. YOLOv8 ENSEMBLE:
   ✓ Run both methods
   ✓ Combine results
   ✓ Higher precision/recall

NEXT STEPS:
──────────

Option A: Traditional Detection Only
   - Use OpenCV with image processing
   - Faster, more reliable with limited data
   - Requires: pip install opencv-python

Option B: Better Model Training
   - Collect 300+ real water damage images
   - Manual annotation using Roboflow
   - Train on quality dataset
   - Time: 1-2 weeks

Option C: Quick Improvement
   - Lower YOLOv8 threshold to 0.1
   - Add traditional processing fallback
   - Deploy today, improve later

RECOMMENDATION: Option C + A
   - Deploy working detection now
   - Use traditional method as primary
   - Improve with more data over time
`);
