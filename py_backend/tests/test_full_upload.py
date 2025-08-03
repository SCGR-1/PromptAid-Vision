#!/usr/bin/env python3
"""Test script to simulate the full upload flow"""

import asyncio
import io
import requests
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal
from app import crud, models

def test_full_upload_flow():
    """Test the complete upload flow"""
    print("=== Testing Full Upload Flow ===")
    
    # Simulate the upload request
    url = "http://localhost:8000/api/images/"
    
    # Create a test image file
    test_image_content = b"fake image data"
    test_file = io.BytesIO(test_image_content)
    
    # Prepare form data
    files = {'file': ('test_image.jpg', test_file, 'image/jpeg')}
    data = {
        'source': 'OTHER',
        'type': 'OTHER', 
        'epsg': '4326',
        'image_type': 'crisis_map',
        'countries': ['US', 'CA']
    }
    
    try:
        print("Sending upload request...")
        response = requests.post(url, files=files, data=data)
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Upload successful! Image ID: {result.get('image_id')}")
            
            # Now test caption generation
            image_id = result.get('image_id')
            if image_id:
                caption_url = f"http://localhost:8000/api/images/{image_id}/caption"
                caption_data = {
                    'title': 'Test Caption',
                    'prompt': 'Describe this crisis map in detail'
                }
                
                print("Sending caption generation request...")
                caption_response = requests.post(caption_url, data=caption_data)
                print(f"Caption response status: {caption_response.status_code}")
                print(f"Caption response body: {caption_response.text}")
                
        else:
            print("Upload failed!")
            
    except Exception as e:
        print(f"Error during upload test: {e}")

def check_database_contents():
    """Check what's actually in the database"""
    print("\n=== Checking Database Contents ===")
    db = SessionLocal()
    try:
        # Check images
        images = db.query(models.Images).all()
        print(f"Total images in database: {len(images)}")
        for img in images:
            print(f"  Image ID: {img.image_id}, Source: {img.source}, Type: {img.type}")
            
        # Check captions
        captions = db.query(models.Captions).all()
        print(f"Total captions in database: {len(captions)}")
        for cap in captions:
            print(f"  Caption ID: {cap.cap_id}, Image ID: {cap.image_id}")
            
    except Exception as e:
        print(f"Error checking database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # First check what's in the database
    check_database_contents()
    
    # Then test the upload flow
    test_full_upload_flow()
    
    # Check again after upload
    print("\n" + "="*50)
    check_database_contents() 