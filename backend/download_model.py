#!/usr/bin/env python3
"""
Download YOLOv8n ONNX model from HuggingFace
Uses requests library for reliable handling of redirects
"""

import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ requests library not found. Installing...")
    os.system("pip install requests")
    import requests

MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "yolov8n.onnx"

# Check if model already exists
if MODEL_PATH.exists():
    file_size = MODEL_PATH.stat().st_size
    if file_size > 1000000:  # At least 1MB
        print(f"✅ YOLOv8n model already exists ({file_size / 1024 / 1024:.1f} MB)")
        sys.exit(0)
    else:
        print(f"⚠️ Corrupted model file ({file_size} bytes), re-downloading...")
        MODEL_PATH.unlink()

# Ensure models directory exists
MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("📦 Downloading YOLOv8n ONNX model...")
print(f"Saving to: {MODEL_PATH}")

url = "https://huggingface.co/onnx-community/yolov8n/resolve/main/onnx/model.onnx"

try:
    response = requests.get(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
        stream=True,
        timeout=60,
        allow_redirects=True
    )
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    
    with open(MODEL_PATH, 'wb') as f:
        downloaded = 0
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    sys.stdout.write(f"\r⬇️ Downloading: {percent:.1f}% ({downloaded} bytes)")
                else:
                    sys.stdout.write(f"\r⬇️ Downloading: {downloaded} bytes")
                sys.stdout.flush()
    
    file_size = MODEL_PATH.stat().st_size
    
    if file_size < 1000000:
        print(f"\n❌ Downloaded file too small ({file_size} bytes)")
        MODEL_PATH.unlink()
        sys.exit(1)
    
    print(f"\n✅ Model downloaded successfully! ({file_size / 1024 / 1024:.1f} MB)")
    print(f"Location: {MODEL_PATH}")
    sys.exit(0)

except Exception as e:
    print(f"\n❌ Download failed: {e}")
    if MODEL_PATH.exists():
        MODEL_PATH.unlink()
    sys.exit(1)
