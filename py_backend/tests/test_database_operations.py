#!/usr/bin/env python3
"""Test database operations and frontend-backend connectivity"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
import time
from app.database import SessionLocal
from app import crud, models

def test_frontend_backend_connection():
    """Test if frontend and backend are properly connected"""
    print("=== Testing Frontend-Backend Connection ===")
    
    # Test 1: Check if backend is accessible from frontend perspective
    print("1. Testing backend accessibility...")
    try:
        response = requests.get('http://localhost:8080/api/images/', timeout=10)
        print(f"   Backend status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✓ Backend is accessible!")
            data = response.json()
            print(f"   ✓ Found {len(data)} images in database")
        else:
            print(f"   ✗ Backend not accessible: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ✗ Cannot connect to backend: {e}")
        return False
    
    # Test 2: Check if frontend proxy is working (simulate frontend request)
    print("\n2. Testing frontend proxy connection...")
    try:
        # Simulate frontend request with proper headers
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get('http://localhost:8080/api/images/', headers=headers, timeout=10)
        print(f"   Frontend proxy status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✓ Frontend proxy is working!")
        else:
            print(f"   ✗ Frontend proxy failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ✗ Frontend proxy error: {e}")
    
    return True

def test_database_save():
    """Test if data is actually being saved to the database during upload"""
    print("\n=== Testing Database Save ===")
    
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
                    'edited': 'This is a test caption for database save test.',
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
                    
                    # Step 7: Check if submitted data is in database
                    print("7. Checking if submitted data is saved to database...")
                    db = SessionLocal()
                    try:
                        db_caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
                        if db_caption:
                            print(f"   ✓ Submitted caption found in database!")
                            print(f"   ✓ Edited: {db_caption.edited}")
                            print(f"   ✓ Accuracy: {db_caption.accuracy}")
                            print(f"   ✓ Context: {db_caption.context}")
                            print(f"   ✓ Usability: {db_caption.usability}")
                        else:
                            print(f"   ✗ ERROR: Submitted caption NOT found in database!")
                            return False
                    finally:
                        db.close()
                    
                    # Clean up
                    print("8. Cleaning up...")
                    delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                    print(f"   Delete status: {delete_response.status_code}")
                    
                else:
                    print(f"   ✗ ERROR: Caption submission failed: {submit_response.text}")
            else:
                print(f"   ✗ ERROR: Caption creation failed: {caption_response.text}")
        else:
            print(f"   ✗ ERROR: Upload failed: {upload_response.text}")
            
    except Exception as e:
        print(f"   ✗ ERROR: Database save test failed: {e}")

def test_submit_flow():
    """Test the complete submit flow like the frontend does"""
    print("\n=== Testing Complete Submit Flow ===")
    
    # Step 1: Upload image (like frontend handleGenerate)
    print("1. Uploading image (simulating frontend handleGenerate)...")
    test_content = b"submit test image data"
    files = {'file': ('submit_test.jpg', test_content, 'image/jpeg')}
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
            
            # Step 2: Create caption (like frontend handleGenerate)
            print("2. Creating caption (simulating frontend handleGenerate)...")
            caption_data = {
                'title': 'Submit Test Caption',
                'prompt': 'Describe this test image for submit flow'
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
                
                # Step 3: Submit caption (like frontend handleSubmit)
                print("3. Submitting caption (simulating frontend handleSubmit)...")
                submit_data = {
                    'edited': 'This is a test caption submitted via the submit flow.',
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
                    
                    # Step 4: Verify data is saved and accessible
                    print("4. Verifying data is saved and accessible...")
                    time.sleep(1)
                    
                    # Check via API
                    list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
                    if list_response.status_code == 200:
                        images = list_response.json()
                        submitted_image = next((img for img in images if img.get('image_id') == image_id), None)
                        
                        if submitted_image:
                            print("   ✓ SUCCESS: Submitted image found via API!")
                            caption = submitted_image.get('caption')
                            if caption:
                                print(f"   ✓ Caption edited: {caption.get('edited', 'N/A')}")
                                print(f"   ✓ Accuracy: {caption.get('accuracy', 'N/A')}")
                            else:
                                print("   ✗ ERROR: Caption not found in API response!")
                        else:
                            print("   ✗ ERROR: Submitted image NOT found via API!")
                    
                    # Check database directly
                    db = SessionLocal()
                    try:
                        db_image = db.query(models.Images).filter(models.Images.image_id == image_id).first()
                        if db_image:
                            print("   ✓ SUCCESS: Submitted image found in database!")
                            if db_image.caption:
                                print(f"   ✓ Caption edited: {db_image.caption.edited}")
                                print(f"   ✓ Accuracy: {db_image.caption.accuracy}")
                            else:
                                print("   ✗ ERROR: Caption not found in database!")
                        else:
                            print("   ✗ ERROR: Submitted image NOT found in database!")
                    finally:
                        db.close()
                    
                    # Clean up
                    print("5. Cleaning up...")
                    delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                    print(f"   Delete status: {delete_response.status_code}")
                    
                else:
                    print(f"   ✗ ERROR: Caption submission failed: {submit_response.text}")
            else:
                print(f"   ✗ ERROR: Caption creation failed: {caption_response.text}")
        else:
            print(f"   ✗ ERROR: Upload failed: {upload_response.text}")
            
    except Exception as e:
        print(f"   ✗ ERROR: Submit flow test failed: {e}")

def check_caption_exists():
    """Check if a specific caption exists in the database"""
    print("\n=== Checking Specific Caption ===")
    
    caption_id = "a57497fe-1583-4cec-8b34-a94bb229e3ea"
    print(f"Checking if caption {caption_id} exists...")
    
    db = SessionLocal()
    try:
        caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
        if caption:
            print(f"✓ Caption found!")
            print(f"  Image ID: {caption.image_id}")
            print(f"  Title: {caption.title}")
            print(f"  Generated: {caption.generated[:50]}...")
        else:
            print(f"✗ Caption NOT found!")
            
            # Check if the image exists
            all_captions = db.query(models.Captions).all()
            print(f"Total captions: {len(all_captions)}")
            if all_captions:
                print("Recent captions:")
                for i, c in enumerate(all_captions[-3:]):  # Show last 3
                    print(f"  {i+1}. {c.cap_id} -> Image: {c.image_id}")
    finally:
        db.close()

def check_database_consistency():
    """Check database consistency and relationships"""
    print("\n=== Checking Database Consistency ===")
    
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
        
        # Check for orphaned captions
        orphaned_captions = db.query(models.Captions).filter(
            ~models.Captions.image_id.in_([img.image_id for img in images])
        ).all()
        
        if orphaned_captions:
            print(f"WARNING: Found {len(orphaned_captions)} orphaned captions!")
            for cap in orphaned_captions:
                print(f"  - {cap.cap_id} -> Image: {cap.image_id}")
        else:
            print("✓ No orphaned captions found")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_frontend_backend_connection()
    test_database_save()
    test_submit_flow()
    check_caption_exists()
    check_database_consistency() 