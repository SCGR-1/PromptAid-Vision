#!/usr/bin/env python3
"""Test script to directly test the upload endpoint"""

import asyncio
import io
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal
from app import crud, models, storage

def test_direct_upload():
    """Test the upload process directly without HTTP"""
    print("=== Testing Direct Upload ===")
    
    db = SessionLocal()
    try:
        # Simulate the upload process
        print("1. Reading file content...")
        test_content = b"fake image data for testing"
        sha = crud.hash_bytes(test_content)
        print(f"   File hash: {sha[:16]}...")
        
        print("2. Uploading to storage...")
        key = storage.upload_fileobj(io.BytesIO(test_content), "test_direct.jpg")
        print(f"   Storage key: {key}")
        
        print("3. Creating image record in database...")
        img = crud.create_image(
            db=db,
            src="OTHER",
            type_code="OTHER", 
            key=key,
            sha=sha,
            countries=["US", "CA"],
            epsg="4326",
            image_type="crisis_map"
        )
        print(f"   Image created with ID: {img.image_id}")
        
        print("4. Creating caption...")
        caption = crud.create_caption(
            db=db,
            image_id=img.image_id,
            title="Direct Test Caption",
            prompt="Describe this crisis map in detail",
            model_code="STUB_MODEL",
            raw_json={"test": True},
            text="This is a test caption created directly."
        )
        print(f"   Caption created with ID: {caption.cap_id}")
        
        print("5. Verifying in database...")
        # Check if the image exists
        saved_img = db.query(models.Images).filter(models.Images.image_id == img.image_id).first()
        if saved_img:
            print(f"   + Image found in database: {saved_img.image_id}")
        else:
            print(f"   - Image NOT found in database!")
            
        # Check if the caption exists
        saved_caption = db.query(models.Captions).filter(models.Captions.cap_id == caption.cap_id).first()
        if saved_caption:
            print(f"   + Caption found in database: {saved_caption.cap_id}")
        else:
            print(f"   - Caption NOT found in database!")
            
        print("6. Cleaning up...")
        db.delete(img)  # This should cascade delete the caption
        db.commit()
        print("   + Cleanup completed")
        
    except Exception as e:
        print(f"Error during direct upload test: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_direct_upload() 