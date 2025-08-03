#!/usr/bin/env python3
"""Test the full upload flow to debug why uploaded maps aren't showing in explore page"""

import asyncio
import io
import requests
import time
from app.database import SessionLocal
from app import crud, models

def test_upload_flow():
    """Test the complete upload flow"""
    print("=== Testing Upload Flow ===")
    
    # Create test image data
    test_content = b"test image data for upload flow"
    test_filename = "test_upload.jpg"
    
    # Step 1: Upload image via API
    print("1. Uploading image via API...")
    files = {'file': (test_filename, io.BytesIO(test_content), 'image/jpeg')}
    data = {
        'source': 'OTHER',
        'type': 'OTHER', 
        'countries': ['US'],
        'epsg': '4326',
        'image_type': 'crisis_map'
    }
    
    try:
        response = requests.post('http://localhost:8000/api/images/', files=files, data=data)
        print(f"Upload response status: {response.status_code}")
        
        if response.status_code == 200:
            upload_result = response.json()
            image_id = upload_result['image_id']
            print(f"Upload successful! Image ID: {image_id}")
            
            # Step 2: Create caption via API
            print("2. Creating caption via API...")
            caption_data = {
                'title': 'Test Caption',
                'prompt': 'Describe this test image'
            }
            
            caption_response = requests.post(
                f'http://localhost:8000/api/images/{image_id}/caption',
                data=caption_data
            )
            print(f"Caption response status: {caption_response.status_code}")
            
            if caption_response.status_code == 200:
                caption_result = caption_response.json()
                caption_id = caption_result['cap_id']
                print(f"Caption created! Caption ID: {caption_id}")
                
                # Step 3: Check if image appears in list
                print("3. Checking if image appears in list...")
                time.sleep(1)  # Give a moment for database to settle
                
                list_response = requests.get('http://localhost:8000/api/images/')
                print(f"List response status: {list_response.status_code}")
                
                if list_response.status_code == 200:
                    images = list_response.json()
                    print(f"Total images in list: {len(images)}")
                    
                    # Check if our uploaded image is in the list
                    uploaded_image = next((img for img in images if img['image_id'] == image_id), None)
                    if uploaded_image:
                        print("SUCCESS: Uploaded image found in list!")
                        print(f"Image details: {uploaded_image}")
                    else:
                        print("ERROR: Uploaded image NOT found in list!")
                        print("Available image IDs:", [img['image_id'] for img in images])
                
                # Step 4: Check database directly
                print("4. Checking database directly...")
                db = SessionLocal()
                try:
                    # Check images table
                    db_image = db.query(models.Images).filter(models.Images.image_id == image_id).first()
                    if db_image:
                        print(f"SUCCESS: Image found in database: {db_image.image_id}")
                        print(f"Image source: {db_image.source}, type: {db_image.type}")
                    else:
                        print("ERROR: Image NOT found in database!")
                    
                    # Check captions table
                    db_caption = db.query(models.Captions).filter(models.Captions.image_id == image_id).first()
                    if db_caption:
                        print(f"SUCCESS: Caption found in database: {db_caption.cap_id}")
                    else:
                        print("ERROR: Caption NOT found in database!")
                    
                    # Check total counts
                    total_images = db.query(models.Images).count()
                    total_captions = db.query(models.Captions).count()
                    print(f"Total images in database: {total_images}")
                    print(f"Total captions in database: {total_captions}")
                    
                finally:
                    db.close()
                
                # Step 5: Clean up
                print("5. Cleaning up test data...")
                delete_response = requests.delete(f'http://localhost:8000/api/images/{image_id}')
                print(f"Delete response status: {delete_response.status_code}")
                
            else:
                print(f"Caption creation failed: {caption_response.text}")
        else:
            print(f"Upload failed: {response.text}")
            
    except Exception as e:
        print(f"Error during upload flow: {e}")

def check_database_state():
    """Check the current state of the database"""
    print("\n=== Checking Database State ===")
    
    db = SessionLocal()
    try:
        # Check all tables
        images = db.query(models.Images).all()
        captions = db.query(models.Captions).all()
        sources = db.query(models.Source).all()
        types = db.query(models.Type).all()
        countries = db.query(models.Country).all()
        
        print(f"Images: {len(images)}")
        for img in images:
            print(f"  - {img.image_id}: {img.source}/{img.type} (has caption: {img.caption is not None})")
        
        print(f"Captions: {len(captions)}")
        for cap in captions:
            print(f"  - {cap.cap_id}: {cap.title}")
        
        print(f"Sources: {len(sources)}")
        print(f"Types: {len(types)}")
        print(f"Countries: {len(countries)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting upload flow test...")
    
    # Wait a moment for server to start
    time.sleep(2)
    
    # Check initial database state
    check_database_state()
    
    # Test the upload flow
    test_upload_flow()
    
    # Check final database state
    check_database_state()
    
    print("\n=== Upload Flow Test Completed ===") 