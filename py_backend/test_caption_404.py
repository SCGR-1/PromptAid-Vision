#!/usr/bin/env python3
"""Test to debug the 404 caption error"""

import requests
import time
from app.database import SessionLocal
from app import crud, models

def test_caption_404_debug():
    """Debug the 404 caption error"""
    print("=== Debugging Caption 404 Error ===")
    
    # Test 1: Check if the specific caption ID exists
    caption_id = "61c249dd-133a-4e4a-a643-ea95c643bdae"
    print(f"1. Checking if caption {caption_id} exists in database...")
    
    db = SessionLocal()
    try:
        caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
        if caption:
            print(f"   ✓ Caption found in database!")
            print(f"   ✓ Image ID: {caption.image_id}")
            print(f"   ✓ Title: {caption.title}")
            print(f"   ✓ Generated: {caption.generated[:50]}...")
            print(f"   ✓ Edited: {caption.edited[:50] if caption.edited else 'None'}...")
        else:
            print(f"   ✗ Caption NOT found in database!")
            print(f"   ✗ This explains the 404 error!")
            
            # Check if any captions exist
            all_captions = db.query(models.Captions).all()
            print(f"   Total captions in database: {len(all_captions)}")
            if all_captions:
                print("   Recent captions:")
                for i, c in enumerate(all_captions[-5:]):  # Show last 5
                    print(f"     {i+1}. {c.cap_id} -> Image: {c.image_id}")
    finally:
        db.close()
    
    # Test 2: Try to get the caption via API
    print(f"\n2. Testing GET /api/captions/{caption_id}...")
    try:
        response = requests.get(f'http://localhost:8080/api/captions/{caption_id}', timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            caption_data = response.json()
            print(f"   ✓ Caption found via API!")
            print(f"   ✓ Image ID: {caption_data.get('image_id')}")
        else:
            print(f"   ✗ Caption not found via API: {response.text}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test 3: Check if the image exists
    print(f"\n3. Checking if the associated image exists...")
    try:
        # First get the caption to find the image_id
        db = SessionLocal()
        caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
        if caption:
            image_id = caption.image_id
            print(f"   Caption found, checking image {image_id}...")
            
            image = db.query(models.Images).filter(models.Images.image_id == image_id).first()
            if image:
                print(f"   ✓ Image found!")
                print(f"   ✓ Source: {image.source}")
                print(f"   ✓ Type: {image.type}")
            else:
                print(f"   ✗ Image NOT found!")
                print(f"   ✗ This suggests the image was deleted!")
        else:
            print(f"   ✗ Cannot check image - caption not found!")
    finally:
        db.close()
    
    # Test 4: Test caption creation and submission flow
    print(f"\n4. Testing complete caption creation and submission flow...")
    test_content = b"caption 404 test image data"
    files = {'file': ('caption_404_test.jpg', test_content, 'image/jpeg')}
    data = {
        'source': 'OTHER',
        'type': 'OTHER',
        'countries': ['US'],
        'epsg': '4326',
        'image_type': 'crisis_map'
    }
    
    try:
        # Upload image
        upload_response = requests.post('http://localhost:8080/api/images/', files=files, data=data, timeout=30)
        print(f"   Upload status: {upload_response.status_code}")
        
        if upload_response.status_code == 200:
            upload_result = upload_response.json()
            image_id = upload_result.get('image_id')
            print(f"   ✓ Upload successful! Image ID: {image_id}")
            
            # Create caption
            caption_data = {
                'title': '404 Test Caption',
                'prompt': 'Describe this test image'
            }
            
            caption_response = requests.post(
                f'http://localhost:8080/api/images/{image_id}/caption',
                data=caption_data
            )
            print(f"   Caption creation status: {caption_response.status_code}")
            
            if caption_response.status_code == 200:
                caption_result = caption_response.json()
                caption_id = caption_result.get('cap_id')
                print(f"   ✓ Caption created! Caption ID: {caption_id}")
                
                # Test GET caption
                get_response = requests.get(f'http://localhost:8080/api/captions/{caption_id}', timeout=10)
                print(f"   GET caption status: {get_response.status_code}")
                
                if get_response.status_code == 200:
                    print("   ✓ GET caption successful!")
                    
                    # Test PUT caption (submit)
                    submit_data = {
                        'edited': 'This is a test caption for 404 debugging.',
                        'accuracy': 85,
                        'context': 90,
                        'usability': 80
                    }
                    
                    submit_response = requests.put(
                        f'http://localhost:8080/api/captions/{caption_id}',
                        json=submit_data
                    )
                    print(f"   PUT caption status: {submit_response.status_code}")
                    
                    if submit_response.status_code == 200:
                        print("   ✓ PUT caption successful!")
                    else:
                        print(f"   ✗ PUT caption failed: {submit_response.text}")
                else:
                    print(f"   ✗ GET caption failed: {get_response.text}")
                
                # Clean up
                print("   Cleaning up...")
                delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                print(f"   Delete status: {delete_response.status_code}")
                
            else:
                print(f"   ✗ Caption creation failed: {caption_response.text}")
                
        else:
            print(f"   ✗ Upload failed: {upload_response.text}")
            
    except Exception as e:
        print(f"   ✗ Error during test: {e}")

def check_database_consistency():
    """Check database consistency for captions"""
    print("\n=== Checking Database Consistency ===")
    
    db = SessionLocal()
    try:
        # Check all captions
        captions = db.query(models.Captions).all()
        images = db.query(models.Images).all()
        
        print(f"Total captions: {len(captions)}")
        print(f"Total images: {len(images)}")
        
        # Check for orphaned captions (captions without images)
        orphaned_captions = []
        for caption in captions:
            image = db.query(models.Images).filter(models.Images.image_id == caption.image_id).first()
            if not image:
                orphaned_captions.append(caption)
        
        if orphaned_captions:
            print(f"⚠ Found {len(orphaned_captions)} orphaned captions!")
            for caption in orphaned_captions:
                print(f"   - Caption {caption.cap_id} references non-existent image {caption.image_id}")
        else:
            print("✓ No orphaned captions found")
        
        # Check for images without captions
        images_without_captions = []
        for image in images:
            caption = db.query(models.Captions).filter(models.Captions.image_id == image.image_id).first()
            if not caption:
                images_without_captions.append(image)
        
        print(f"Images without captions: {len(images_without_captions)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting Caption 404 Debug...")
    
    # Test 1: Debug the specific 404 error
    test_caption_404_debug()
    
    # Test 2: Check database consistency
    check_database_consistency()
    
    print("\n=== Caption 404 Debug Completed ===") 