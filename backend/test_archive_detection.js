/**
 * Test YOLOv8 leak detection on archive images
 * Tests the model's ability to detect leaks in real water damage images
 */

const fs = require("fs");
const path = require("path");
const { loadModel, analyzeWithYOLOv8 } = require("./utils/yolov8-leak-detector");

const ARCHIVE_DIR = path.join(__dirname, "../archive");
const OUTPUT_DIR = path.join(__dirname, "./test_results/archive_detection");

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Get all JPEG images from archive
 */
function getTestImages() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    console.error(`❌ Archive directory not found: ${ARCHIVE_DIR}`);
    return [];
  }

  const files = fs.readdirSync(ARCHIVE_DIR);
  return files
    .filter((f) => f.endsWith(".jpeg") || f.endsWith(".jpg"))
    .map((f) => path.join(ARCHIVE_DIR, f));
}

/**
 * Extract detection info from console output
 * Parses the console logs to count detections
 */
let lastDetectionCount = 0;
let lastDetectionInfo = [];

// Monkey-patch console.log to capture detection output
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(" ");
  
  if (message.includes("After NMS:")) {
    const match = message.match(/After NMS: (\d+) detection/);
    if (match) {
      lastDetectionCount = parseInt(match[1]);
      lastDetectionInfo = [];
    }
  }
  
  if (message.includes("Class")) {
    lastDetectionInfo.push(message);
  }
  
  originalLog.apply(console, args);
};

/**
 * Main test runner
 */
async function runArchiveTests() {
  console.log("\n");
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " YOLOv8 Water Leak Detection - Archive Testing ".padEnd(59) + "║");
  console.log("╚" + "═".repeat(58) + "╝");

  ensureOutputDir();

  // Load model
  console.log("\n📦 Loading YOLOv8n model...");
  try {
    await loadModel();
  } catch (err) {
    console.error("❌ Failed to load model:", err.message);
    process.exit(1);
  }

  // Get test images
  const testImages = getTestImages();
  if (testImages.length === 0) {
    console.error("❌ No JPEG images found in archive directory");
    process.exit(1);
  }

  console.log(`\n📸 Found ${testImages.length} test images`);

  // Test each image
  const results = [];
  for (let i = 0; i < testImages.length; i++) {
    const imagePath = testImages[i];
    const filename = path.basename(imagePath);
    const testNum = i + 1;

    process.stdout.write(`\n[${testNum}/${testImages.length}] Testing ${filename}... `);

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const startTime = Date.now();

      // Reset detection tracking
      lastDetectionCount = 0;
      lastDetectionInfo = [];

      // Analyze with YOLOv8
      const annotatedBase64 = await analyzeWithYOLOv8(imageBuffer);
      const inferenceTime = Date.now() - startTime;

      // Save annotated image
      const outputName = `${path.basename(imagePath, path.extname(imagePath))}_detected.png`;
      const outputPath = path.join(OUTPUT_DIR, outputName);
      const annotatedBuffer = Buffer.from(annotatedBase64, "base64");
      fs.writeFileSync(outputPath, annotatedBuffer);

      const detectStatus = lastDetectionCount > 0 ? "🎯 DETECTED" : "✓ NO DETECTIONS";
      console.log(`✅ (${inferenceTime}ms) ${detectStatus}`);
      
      results.push({
        image: filename,
        status: "success",
        time: inferenceTime,
        detectionCount: lastDetectionCount,
        detectionInfo: lastDetectionInfo,
        outputPath: outputName,
      });
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({
        image: filename,
        status: "error",
        error: err.message,
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  const withDetections = results.filter((r) => r.status === "success" && r.detectionCount > 0).length;
  const avgTime =
    results.reduce((sum, r) => sum + (r.time || 0), 0) / successful || 0;
  const totalDetections = results.reduce((sum, r) => sum + (r.detectionCount || 0), 0);

  console.log(`\n📊 Processing Results:`);
  console.log(`  ✅ Successfully processed: ${successful}/${testImages.length}`);
  console.log(`  ❌ Failed: ${failed}/${testImages.length}`);
  console.log(`  ⏱️ Average inference time: ${avgTime.toFixed(0)}ms`);

  console.log(`\n🎯 Detection Results:`);
  console.log(`  🔍 Images with detections: ${withDetections}/${successful}`);
  console.log(`  📦 Total objects detected: ${totalDetections}`);
  console.log(`  📈 Average detections per image: ${(totalDetections / successful).toFixed(1)}`);

  // Detailed results
  console.log(`\n📝 Detailed Results:`);
  results.forEach((result, i) => {
    const status = result.status === "success" ? "✅" : "❌";
    const timeStr = result.time ? ` (${result.time}ms)` : "";
    const detStr = result.status === "success" ? 
      ` [${result.detectionCount} obj detected]` : 
      result.error;
    console.log(`  ${status} ${(i + 1).toString().padEnd(2)} ${result.image.padEnd(25)} ${detStr}${timeStr}`);
  });

  console.log(`\n📁 Annotated images with bounding boxes saved to:`);
  console.log(`   ${OUTPUT_DIR}`);

  // Summary JSON
  const summaryPath = path.join(OUTPUT_DIR, "results.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalImages: testImages.length,
        successfulProcessing: successful,
        failedProcessing: failed,
        imagesWithDetections: withDetections,
        totalObjectsDetected: totalDetections,
        avgInferenceTimeMs: avgTime,
        avgDetectionsPerImage: totalDetections / successful,
        results,
      },
      null,
      2
    )
  );
  console.log(`   Summary: ${summaryPath}`);

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runArchiveTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
