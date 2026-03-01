#!/usr/bin/env python3
"""
Download and convert YOLOv8n model to ONNX format
Uses Ultralytics' export pipeline for reliable conversion
"""

import os
import sys
from pathlib import Path

# Model paths
model_dir = Path(__file__).parent / "models"
onnx_path = model_dir / "yolov8n.onnx"
pt_path = model_dir / "yolov8n.pt"

# Create directory if needed
model_dir.mkdir(exist_ok=True, parents=True)

# Check if ONNX model already exists
if onnx_path.exists():
    size = onnx_path.stat().st_size
    if size > 1000000:  # > 1MB
        print(f"✅ Model already exists: {onnx_path} ({size / 1024 / 1024:.1f}MB)")
        sys.exit(0)
    else:
        print(f"⚠️ Existing model is too small ({size} bytes), removing...")
        onnx_path.unlink()

print("📥 Downloading and converting YOLOv8n to ONNX...")

try:
    # Import ultralytics
    try:
        from ultralytics import YOLO
    except ImportError:
        print("❌ ultralytics package not found")
        print("📌 Please install it with: pip install ultralytics")
        sys.exit(1)
    
    print("🔽 Loading YOLOv8n model...")
    # This will download the pretrained model from Ultralytics if not present
    model = YOLO("yolov8n.pt")
    
    print("⚙️ Converting to ONNX format...")
    # Export to ONNX (use cpu if CUDA not available)
    results = model.export(format="onnx", imgsz=640, opset=12, device='cpu')
    
    # Check if export was successful
    exported_path = Path(results) if isinstance(results, str) else results[0] if isinstance(results, (list, tuple)) else None
    
    if exported_path and exported_path.exists():
        # Move to expected location if needed
        if str(exported_path) != str(onnx_path):
            import shutil
            shutil.copy(str(exported_path), str(onnx_path))
    
    # Verify the ONNX model exists and has reasonable size
    if onnx_path.exists():
        size = onnx_path.stat().st_size
        if size > 1000000:
            print(f"✅ YOLOv8n model converted to ONNX successfully! ({size / 1024 / 1024:.1f}MB)")
            print(f"📁 Model saved to: {onnx_path}")
            sys.exit(0)
        else:
            onnx_path.unlink()
            print(f"❌ Converted file is too small ({size} bytes)")
            sys.exit(1)
    else:
        print(f"❌ Export failed - file not found at {onnx_path}")
        sys.exit(1)
        
except Exception as e:
    if onnx_path.exists():
        onnx_path.unlink()
    print(f"❌ Conversion failed: {e}")
    print(f"\n📌 To install ultralytics, run:")
    print(f"   pip install ultralytics")
    sys.exit(1)
