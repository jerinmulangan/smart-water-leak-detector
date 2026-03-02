/**
 * Quick start guide for custom water damage model training and inference
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     YOLOv8 Water Damage Detection - Quick Start Guide         ║
╚════════════════════════════════════════════════════════════════╝

📌 CURRENT SITUATION:
   - Generic YOLOv8n detects common objects (chairs, bicycles)
   - Not trained for water damage/leaks
   - Confidence scores are garbage (all ~25%)

✅ SOLUTION: Train custom model on your water leak images

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 STEP 1: Prepare for training
─────────────────────────────────
Your archive has 20 water leak images (auto-labeled as demo)

Optional - Better results with manual annotation:
   1. Use Roboflow (https://roboflow.com) for annotation
   2. Or use LabelImg desktop tool for manual bounding boxes
   3. Export in YOLO format to backend/data/water_damage/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 STEP 2: Train the model
─────────────────────────
Run this command:

    npm run train:water-damage

This will:
   ✓ Create dataset from archive images (80% train, 20% val)
   ✓ Auto-label images as water damage (placeholder)
   ✓ Train YOLOv8n for 50 epochs
   ✓ Export to ONNX format
   ✓ Save to: backend/models/yolov8n_water_damage.onnx

⏱️ Training time: ~5-10 minutes on CPU, ~1-2 minutes on GPU

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STEP 3: Use custom model
──────────────────────────
After training, update the detector:

    // In yolov8-leak-detector.js, change:
    const MODEL_PATH = path.join(__dirname, 
      "../models/yolov8n_water_damage.onnx");  // Use trained model
    
    const CONFIDENCE_THRESHOLD = 0.5;  // Adjust based on results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ STEP 4: Test with trained model
──────────────────────────────────
    npm run test:archive

Results should now show actual water damage detections!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 RECOMMENDATIONS FOR PRODUCTION:

1. GATHER MORE DATA (300-500+ images):
   ✓ Collect diverse water damage images
   ✓ Different lighting conditions
   ✓ Different damage types (stains, mold, active leaks, etc.)
   ✓ False positives (clean surfaces, shadows, etc.)

2. PROPER ANNOTATION:
   ✓ Use Roboflow.com for easy team annotation
   ✓ Draw bounding boxes around damage areas
   ✓ Export in YOLO format
   ✓ Aim for high-quality labels

3. TRAINING STRATEGY:
   ✓ Start with 100 epochs minimum
   ✓ Use data augmentation (rotation, brightness, etc.)
   ✓ Monitor validation metrics
   ✓ Use early stopping

4. MODEL OPTIMIZATION:
   ✓ YOLOv8m for better accuracy
   ✓ YOLOv8s for faster inference
   ✓ Quantization for edge deployment

5. DEPLOYMENT:
   ✓ Test on diverse water leak images
   ✓ Set appropriate confidence threshold
   ✓ Monitor false positive rate
   ✓ Retrain periodically with new data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❓ TROUBLESHOOTING:

Q: Training fails with CUDA error
A: Ensure device='cpu' is set, or install PyTorch with CUDA support

Q: Results still show 0 detections after training
A: Your archive images may need better annotation. Use manual labeling.

Q: Model training is slow
A: Use YOLOv8s instead of YOLOv8n for faster training/inference

Q: How to improve detection accuracy?
A: 1) More training data (>300 images)
   2) Better annotations (precise bounding boxes)
   3) Longer training (100+ epochs)
   4) Larger model (YOLOv8m)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 USEFUL RESOURCES:

YOLOv8 Documentation:
   https://docs.ultralytics.com/

Roboflow (Image Annotation):
   https://roboflow.com/

LabelImg (Desktop Annotation Tool):
   https://github.com/heartexlabs/labelImg

YOLO Format Guide:
   https://docs.ultralytics.com/datasets/detect/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
