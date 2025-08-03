#!/usr/bin/env python3
"""Test if data is actually being saved to the database during upload"""

import requests
import time
from app.database import SessionLocal
from app import crud, models

def test_database_save():
    """Test if upload data is actually saved to database"""
    print("=== Testing Database Save ===")
    
    # Create test image
    test_content = b"fake image data for database test"
    
    # Step 1: Check initial database state
    print("1. Checking initial database state...")
    db = SessionLocal()
    try:
        initial_images = db.query(models.Images).count()
        initial_captions = db.query(models.Captions).count()
        print(f"   Initial images: {initial_images}")
        print(f"   Initial captions: {initial_captions}")
    finally:
        db.close()
    
    # Step 2: Upload image via API
    print("2. Uploading image via API...")
    files = {'file': ('db_test.jpg', test_content, 'image/jpeg')}
    data = {
        'source': 'OTHER',
        'type': 'OTHER',
        'countries': ['US'],
        'epsg': '4326',
        'image_type': 'crisis_map'
    }
    
    try:
        upload_response = requests.post('http://localhost:8080/api/images/', files=files, data=data, timeout=30)
        print(f"   Upload status: {upload_response.status_code}")
        
        if upload_response.status_code == 200:
            upload_result = upload_response.json()
            image_id = upload_result.get('image_id')
            print(f"   ✓ Upload successful! Image ID: {image_id}")
            
            # Step 3: Check if image is in database immediately after upload
            print("3. Checking if image is saved to database...")
            db = SessionLocal()
            try:
                db_image = db.query(models.Images).filter(models.Images.image_id == image_id).first()
                if db_image:
                    print(f"   ✓ Image found in database!")
                    print(f"   ✓ Source: {db_image.source}")
                    print(f"   ✓ Type: {db_image.type}")
                    print(f"   ✓ File key: {db_image.file_key}")
                else:
                    print(f"   ✗ ERROR: Image NOT found in database!")
                    print(f"   ✗ This means the upload failed to save to database!")
                    return False
            finally:
                db.close()
            
            # Step 4: Create caption via API
            print("4. Creating caption via API...")
            caption_data = {
                'title': 'Database Test Caption',
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
                
                # Step 5: Check if caption is in database
                print("5. Checking if caption is saved to database...")
                db = SessionLocal()
                try:
                    db_caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
                    if db_caption:
                        print(f"   ✓ Caption found in database!")
                        print(f"   ✓ Title: {db_caption.title}")
                        print(f"   ✓ Generated: {db_caption.generated[:50]}...")
                    else:
                        print(f"   ✗ ERROR: Caption NOT found in database!")
                        print(f"   ✗ This means caption creation failed to save to database!")
                        return False
                finally:
                    db.close()
                
                # Step 6: Submit caption via API
                print("6. Submitting caption via API...")
                submit_data = {
                    'edited': 'This is a test caption for database verification.',
                    'accuracy': 85,
                    'context': 90,
                    'usability': 80
                }
                
                submit_response = requests.put(
                    f'http://localhost:8080/api/captions/{caption_id}',
                    json=submit_data
                )
                print(f"   Submit status: {submit_response.status_code}")
                
                if submit_response.status_code == 200:
                    print("   ✓ Caption submitted successfully!")
                    
                    # Step 7: Check if updated caption is in database
                    print("7. Checking if updated caption is saved to database...")
                    db = SessionLocal()
                    try:
                        db_caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
                        if db_caption:
                            print(f"   ✓ Updated caption found in database!")
                            print(f"   ✓ Edited: {db_caption.edited}")
                            print(f"   ✓ Accuracy: {db_caption.accuracy}")
                            print(f"   ✓ Context: {db_caption.context}")
                            print(f"   ✓ Usability: {db_caption.usability}")
                        else:
                            print(f"   ✗ ERROR: Updated caption NOT found in database!")
                            return False
                    finally:
                        db.close()
                    
                    # Step 8: Check final database state
                    print("8. Checking final database state...")
                    db = SessionLocal()
                    try:
                        final_images = db.query(models.Images).count()
                        final_captions = db.query(models.Captions).count()
                        print(f"   Final images: {final_images}")
                        print(f"   Final captions: {final_captions}")
                        print(f"   Images added: {final_images - initial_images}")
                        print(f"   Captions added: {final_captions - initial_captions}")
                    finally:
                        db.close()
                    
                    # Step 9: Clean up
                    print("9. Cleaning up test data...")
                    delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                    print(f"   Delete status: {delete_response.status_code}")
                    
                    return True
                    
                else:
                    print(f"   ✗ Caption submission failed: {submit_response.text}")
                    return False
                    
            else:
                print(f"   ✗ Caption creation failed: {caption_response.text}")
                return False
                
        else:
            print(f"   ✗ Upload failed: {upload_response.text}")
            return False
            
    except Exception as e:
        print(f"   ✗ Error during database test: {e}")
        return False

def check_database_consistency():
    """Check database consistency"""
    print("\n=== Checking Database Consistency ===")
    
    db = SessionLocal()
    try:
        # Check all tables
        images = db.query(models.Images).all()
        captions = db.query(models.Captions).all()
        
        print(f"Total images: {len(images)}")
        print(f"Total captions: {len(captions)}")
        
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
        for image in images_without_captions[:5]:  # Show first 5
            print(f"   - Image {image.image_id}: {image.source}/{image.type}")
        
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting Database Save Test...")
    
    # Check database consistency first
    check_database_consistency()
    
    # Test database save
    success = test_database_save()
    
    # Check database consistency after test
    check_database_consistency()
    
    if success:
        print("\n✅ Database save test PASSED - Data is being saved correctly!")
    else:
        print("\n❌ Database save test FAILED - Data is NOT being saved!")
    
    print("\n=== Database Save Test Completed ===") 