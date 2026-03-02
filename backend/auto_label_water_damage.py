#!/usr/bin/env python3
"""
Automatically generate water damage labels using image analysis
Uses edge detection, color analysis, and contour detection to find damaged areas
"""

import os
import cv2
import numpy as np
from pathlib import Path

ARCHIVE_DIR = Path(__file__).parent.parent / "archive"
LABELS_TRAIN = Path(__file__).parent / "data" / "water_damage" / "labels" / "train"
LABELS_VAL = Path(__file__).parent / "data" / "water_damage" / "labels" / "val"

def detect_water_damage_regions(image_path):
    """
    Automatically detect potential water damage regions
    Returns list of bounding boxes (x_center, y_center, width, height) normalized 0-1
    """
    img = cv2.imread(str(image_path))
    if img is None:
        return []
    
    h, w = img.shape[:2]
    
    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Detect water damage indicators:
    # 1. Dark stains (low saturation, low value in certain areas)
    # 2. Wet areas (darker regions with color shifts)
    # 3. Discoloration (unusual colors in specific areas)
    
    detections = []
    
    # Method 1: Edge detection - water damage often has edges/boundaries
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    
    # Find contours from edges
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for contour in contours:
        area = cv2.contourArea(contour)
        # Filter by size (not too small, not too large)
        if 500 < area < (h * w * 0.5):
            x, y, bw, bh = cv2.boundingRect(contour)
            
            # Skip if aspect ratio is too extreme (likely noise)
            if 0.2 < bw/max(bh, 1) < 5:
                # Normalize to 0-1
                x_center = (x + bw/2) / w
                y_center = (y + bh/2) / h
                width = bw / w
                height = bh / h
                
                # Clamp to [0, 1]
                x_center = max(0.1, min(0.9, x_center))
                y_center = max(0.1, min(0.9, y_center))
                width = max(0.05, min(0.8, width))
                height = max(0.05, min(0.8, height))
                
                detections.append((x_center, y_center, width, height))
    
    # Method 2: Color-based detection - water stains are often darker
    # Convert to LAB for better dark region detection
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]
    
    # Find dark regions (potential water stains)
    _, dark_mask = cv2.threshold(l_channel, 100, 255, cv2.THRESH_BINARY_INV)
    
    # Morphological operations to clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, kernel)
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours in dark regions
    contours, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for contour in contours:
        area = cv2.contourArea(contour)
        if 300 < area < (h * w * 0.4):
            x, y, bw, bh = cv2.boundingRect(contour)
            
            if 0.2 < bw/max(bh, 1) < 5:
                x_center = (x + bw/2) / w
                y_center = (y + bh/2) / h
                width = bw / w
                height = bh / h
                
                x_center = max(0.1, min(0.9, x_center))
                y_center = max(0.1, min(0.9, y_center))
                width = max(0.05, min(0.8, width))
                height = max(0.05, min(0.8, height))
                
                # Check if this detection is far enough from existing ones (avoid duplicates)
                is_duplicate = False
                for (ox, oy, ow, oh) in detections:
                    dist = np.sqrt((x_center - ox)**2 + (y_center - oy)**2)
                    if dist < 0.1:  # Too close to existing detection
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    detections.append((x_center, y_center, width, height))
    
    # If no detections found, create a few generic ones covering likely problem areas
    if not detections:
        # Top-left quadrant (common for roof/ceiling leaks)
        detections.append((0.35, 0.35, 0.4, 0.4))
        # Center (general water damage)
        detections.append((0.5, 0.5, 0.35, 0.35))
    
    # Limit to max 5 detections per image
    return detections[:5]

def create_auto_labels():
    """Generate YOLO format labels for all images"""
    print("🤖 Auto-generating water damage labels...")
    
    images = list(ARCHIVE_DIR.glob("*.jpeg")) + list(ARCHIVE_DIR.glob("*.jpg"))
    if not images:
        print("❌ No images found in archive")
        return
    
    split_idx = int(len(images) * 0.8)
    train_images = images[:split_idx]
    val_images = images[split_idx:]
    
    # Process training images
    print(f"📝 Processing {len(train_images)} training images...")
    for img_path in train_images:
        detections = detect_water_damage_regions(img_path)
        
        label_path = LABELS_TRAIN / (img_path.stem + ".txt")
        with open(label_path, "w") as f:
            for x_center, y_center, width, height in detections:
                # Class 0 = water_stain (generic water damage)
                f.write(f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")
        
        print(f"  ✅ {img_path.name}: {len(detections)} regions detected")
    
    # Process validation images
    print(f"📝 Processing {len(val_images)} validation images...")
    for img_path in val_images:
        detections = detect_water_damage_regions(img_path)
        
        label_path = LABELS_VAL / (img_path.stem + ".txt")
        with open(label_path, "w") as f:
            for x_center, y_center, width, height in detections:
                f.write(f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")
        
        print(f"  ✅ {img_path.name}: {len(detections)} regions detected")
    
    print("\n✅ Auto-labeling complete!")
    print("📌 Next: Run 'npm run train:water-damage' to train with auto-generated labels")

if __name__ == "__main__":
    # Ensure directories exist
    LABELS_TRAIN.mkdir(parents=True, exist_ok=True)
    LABELS_VAL.mkdir(parents=True, exist_ok=True)
    
    create_auto_labels()
