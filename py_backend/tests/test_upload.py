#!/usr/bin/env python3
"""Test script to debug upload flow"""

import asyncio
import io
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal
from app import crud, models

def test_database_connection():
    """Test if we can connect to database and create records"""
    db = SessionLocal()
    try:
        # Test creating an image
        print("Testing database connection...")
        
        # Create a test image
        test_img = models.Images(
            source="OTHER",
            type="OTHER", 
            file_key="test_key",
            sha256="test_sha256",
            epsg="4326",
            image_type="crisis_map"
        )
        
        db.add(test_img)
        db.flush()
        print(f"Created test image with ID: {test_img.image_id}")
        
        # Create a test caption
        test_caption = models.Captions(
            image_id=test_img.image_id,
            title="Test Caption",
            prompt="Test prompt",
            model="STUB_MODEL",
            raw_json={"test": True},
            generated="This is a test caption",
            edited="This is a test caption"
        )
        
        db.add(test_caption)
        db.commit()
        print(f"Created test caption with ID: {test_caption.cap_id}")
        
        # Clean up
        db.delete(test_img)
        db.commit()
        print("Test completed successfully - database is working")
        
    except Exception as e:
        print(f"Database test failed: {e}")
        db.rollback()
    finally:
        db.close()

def test_crud_functions():
    """Test CRUD functions"""
    db = SessionLocal()
    try:
        print("Testing CRUD functions...")
        
        # Test create_image
        img = crud.create_image(
            db=db,
            src="OTHER",
            type_code="OTHER",
            key="test_crud_key",
            sha="test_crud_sha",
            countries=["US", "CA"],
            epsg="4326",
            image_type="crisis_map"
        )
        print(f"CRUD create_image successful: {img.image_id}")
        
        # Test create_caption
        caption = crud.create_caption(
            db=db,
            image_id=img.image_id,
            title="Test CRUD Caption",
            prompt="Test CRUD prompt",
            model_code="STUB_MODEL",
            raw_json={"test_crud": True},
            text="This is a test CRUD caption"
        )
        print(f"CRUD create_caption successful: {caption.cap_id}")
        
        # Clean up
        db.delete(img)
        db.commit()
        print("CRUD test completed successfully")
        
    except Exception as e:
        print(f"CRUD test failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Database Connection Test ===")
    test_database_connection()
    
    print("\n=== CRUD Functions Test ===")
    test_crud_functions() 