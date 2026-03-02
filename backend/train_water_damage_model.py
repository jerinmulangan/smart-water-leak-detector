#!/usr/bin/env python3
"""
Train YOLOv8n model on water leak/damage images from archive
Creates a custom-trained model for water damage detection
"""

import os
import shutil
from pathlib import Path
from ultralytics import YOLO
import yaml

# Setup paths
ARCHIVE_DIR = Path(__file__).parent.parent / "archive"
DATASET_DIR = Path(__file__).parent / "data" / "water_damage"
TRAIN_DIR = DATASET_DIR / "images" / "train"
VAL_DIR = DATASET_DIR / "images" / "val"
LABELS_TRAIN = DATASET_DIR / "labels" / "train"
LABELS_VAL = DATASET_DIR / "labels" / "val"

# Classes for water damage detection
CLASSES = {
    0: "water_stain",
    1: "wet_surface", 
    2: "mold_growth",
    3: "structural_damage",
    4: "active_leak"
}

def setup_dataset():
    """Prepare dataset directory structure"""
    print("📁 Setting up dataset directory structure...")
    
    for dir_path in [TRAIN_DIR, VAL_DIR, LABELS_TRAIN, LABELS_VAL]:
        dir_path.mkdir(parents=True, exist_ok=True)
    
    # Copy archive images to training set (80% train, 20% val)
    if not ARCHIVE_DIR.exists():
        print(f"❌ Archive directory not found: {ARCHIVE_DIR}")
        return False
    
    images = list(ARCHIVE_DIR.glob("*.jpeg")) + list(ARCHIVE_DIR.glob("*.jpg"))
    if not images:
        print("❌ No images found in archive")
        return False
    
    print(f"📸 Found {len(images)} images")
    
    # Split into train/val (80/20)
    split_idx = int(len(images) * 0.8)
    train_images = images[:split_idx]
    val_images = images[split_idx:]
    
    # Copy training images
    print(f"📋 Copying {len(train_images)} images to training set...")
    for img in train_images:
        shutil.copy2(img, TRAIN_DIR / img.name)
    
    # Copy validation images
    print(f"📋 Copying {len(val_images)} images to validation set...")
    for img in val_images:
        shutil.copy2(img, VAL_DIR / img.name)
    
    return True

def create_labels():
    """
    Create YOLO format labels (auto-label all images as water damage)
    Format: <class_id> <x_center> <y_center> <width> <height> (normalized 0-1)
    """
    print("🏷️ Creating labels...")
    
    from PIL import Image
    
    # For demo: label all images as "water_stain" (class 0)
    # In production, use manual annotation or ML-based auto-labeling
    
    for image_path in TRAIN_DIR.glob("*.jpeg"):
        try:
            img = Image.open(image_path)
            width, height = img.size
            
            # Create a centered detection box covering middle 60% of image
            # This is a placeholder - real annotation would be manual or ML-based
            x_center = 0.5  # Normalized
            y_center = 0.5
            w = 0.6
            h = 0.6
            
            label_path = LABELS_TRAIN / (image_path.stem + ".txt")
            with open(label_path, "w") as f:
                # Format: class_id x_center y_center width height
                f.write(f"0 {x_center} {y_center} {w} {h}\n")
        except Exception as e:
            print(f"⚠️ Error processing {image_path.name}: {e}")
    
    for image_path in VAL_DIR.glob("*.jpeg"):
        try:
            img = Image.open(image_path)
            label_path = LABELS_VAL / (image_path.stem + ".txt")
            with open(label_path, "w") as f:
                f.write(f"0 0.5 0.5 0.6 0.6\n")
        except Exception as e:
            print(f"⚠️ Error processing {image_path.name}: {e}")

def create_dataset_yaml():
    """Create YAML config for YOLO training"""
    print("⚙️ Creating dataset configuration...")
    
    dataset_config = {
        'path': str(DATASET_DIR),
        'train': str(TRAIN_DIR),
        'val': str(VAL_DIR),
        'nc': len(CLASSES),
        'names': CLASSES
    }
    
    yaml_path = DATASET_DIR / "data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(dataset_config, f)
    
    print(f"✅ Dataset config saved to {yaml_path}")
    return yaml_path

def train_model(dataset_yaml):
    """Train YOLOv8n on water damage dataset"""
    print("\n🤖 Starting YOLOv8n training on water damage dataset...")
    print("⚠️ Note: With limited data, this is a demonstration")
    print("   For production: collect 500+ diverse water damage images\n")
    
    # Load pretrained YOLOv8n
    model = YOLO("yolov8n.pt")
    
    # Train
    results = model.train(
        data=str(dataset_yaml),
        epochs=50,  # Reduced for demo (use 100+ in production)
        imgsz=640,
        device=0,  # GPU if available, otherwise CPU
        patience=10,  # Early stopping
        save=True,
        project="water_damage_model",
        name="yolov8n_water_damage",
        verbose=True,
    )
    
    print("\n✅ Training complete!")
    print(f"📊 Results directory: {results.save_dir}")
    
    return model

def export_to_onnx(model):
    """Export trained model to ONNX format"""
    print("\n📤 Exporting model to ONNX...")
    
    export_path = model.export(
        format="onnx",
        imgsz=640,
        opset=12,
        device='cpu'
    )
    
    print(f"✅ Model exported to: {export_path}")
    return export_path

def setup_inference_model(onnx_path):
    """Copy exported model to inference location"""
    print("\n📋 Setting up inference model...")
    
    models_dir = Path(__file__).parent / "models"
    models_dir.mkdir(exist_ok=True)
    
    inference_path = models_dir / "yolov8n_water_damage.onnx"
    shutil.copy2(onnx_path, inference_path)
    
    print(f"✅ Inference model ready at: {inference_path}")
    return inference_path

def main():
    print("\n" + "="*60)
    print("YOLOv8n Water Damage Detection - Training Pipeline")
    print("="*60)
    
    # Setup dataset
    if not setup_dataset():
        print("❌ Dataset setup failed")
        return False
    
    # Create labels
    create_labels()
    
    # Create YAML config
    dataset_yaml = create_dataset_yaml()
    
    # Train model
    try:
        model = train_model(dataset_yaml)
        
        # Export to ONNX
        onnx_path = export_to_onnx(model)
        
        # Setup for inference
        inference_path = setup_inference_model(onnx_path)
        
        print("\n" + "="*60)
        print("✅ Water damage model training complete!")
        print("="*60)
        print(f"\n📌 Next steps:")
        print(f"   1. Update yolov8-leak-detector.js to use:")
        print(f"      {inference_path}")
        print(f"   2. Adjust CONFIDENCE_THRESHOLD based on results")
        print(f"   3. Run: npm run test:archive")
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        print(f"\n📌 Troubleshooting:")
        print(f"   - Ensure torch is installed: pip install torch")
        print(f"   - Check GPU availability: python -c \"import torch; print(torch.cuda.is_available())\"")
        print(f"   - For CPU-only: use device='cpu' in train() call")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
