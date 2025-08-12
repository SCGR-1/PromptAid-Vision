#!/usr/bin/env python3
"""Test the complete upload flow: upload → create caption → submit caption"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
import time
import io
from app.database import SessionLocal
from app import crud, models

def test_database_connection():
    """Test if we can connect to database and create records"""
    db = SessionLocal()
    try:
        print("Testing database connection...")
        
        # Test creating an image
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

def test_complete_upload_flow():
    """Test the complete upload flow: upload → create caption → submit caption"""
    print("=== Testing Complete Upload Flow ===")
    
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
        response = requests.post('http://localhost:8080/api/images/', files=files, data=data)
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
                f'http://localhost:8080/api/images/{image_id}/caption',
                data=caption_data
            )
            print(f"Caption response status: {caption_response.status_code}")
            
            if caption_response.status_code == 200:
                caption_result = caption_response.json()
                caption_id = caption_result['cap_id']
                print(f"Caption created! Caption ID: {caption_id}")
                
                # Step 3: Submit caption via API
                print("3. Submitting caption via API...")
                submit_data = {
                    'edited': 'This is a test caption for the upload flow.',
                    'accuracy': 75,
                    'context': 80,
                    'usability': 70
                }
                
                submit_response = requests.put(
                    f'http://localhost:8080/api/captions/{caption_id}',
                    json=submit_data
                )
                print(f"Submit response status: {submit_response.status_code}")
                
                if submit_response.status_code == 200:
                    print("Caption submitted successfully!")
                    
                    # Step 4: Check if image appears in list
                    print("4. Checking if image appears in list...")
                    time.sleep(1)  # Give a moment for database to settle
                    
                    list_response = requests.get('http://localhost:8080/api/images/')
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
                    
                    # Step 5: Check database directly
                    print("5. Checking database directly...")
                    db = SessionLocal()
                    try:
                        # Check images table
                        db_image = db.query(models.Images).filter(models.Images.image_id == image_id).first()
                        if db_image:
                            print(f"SUCCESS: Image found in database: {db_image.image_id}")
                            print(f"Image source: {db_image.source}, event_type: {db_image.event_type}")
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
                    
                    # Clean up
                    print("6. Cleaning up...")
                    delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}')
                    print(f"Delete status: {delete_response.status_code}")
                    
                else:
                    print(f"ERROR: Caption submission failed: {submit_response.text}")
            else:
                print(f"ERROR: Caption creation failed: {caption_response.text}")
        else:
            print(f"ERROR: Upload failed: {response.text}")
            
    except Exception as e:
        print(f"ERROR: Upload flow test failed: {e}")

def test_deletion_logic():
    """Test that images are only deleted when appropriate"""
    print("\n=== Testing Deletion Logic ===")
    
    # Test 1: Upload and verify image exists
    print("1. Uploading test image...")
    test_content = b"deletion test image data"
    files = {'file': ('deletion_test.jpg', test_content, 'image/jpeg')}
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
            
            # Test 2: Verify image exists in database
            print("2. Verifying image exists in database...")
            time.sleep(0.5)
            
            list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
            if list_response.status_code == 200:
                images = list_response.json()
                uploaded_image = next((img for img in images if img.get('image_id') == image_id), None)
                
                if uploaded_image:
                    print("   ✓ Image found in database!")
                else:
                    print("   ✗ ERROR: Image NOT found in database!")
                    return False
            
            # Test 3: Create caption
            print("3. Creating caption...")
            caption_data = {
                'title': 'Deletion Test Caption',
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
                
                # Test 4: Submit caption (simulating successful submission)
                print("4. Submitting caption (simulating successful submission)...")
                submit_data = {
                    'edited': 'This is a test caption for deletion logic.',
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
                    
                    # Test 5: Verify image still exists after submission (should NOT be deleted)
                    print("5. Verifying image still exists after submission...")
                    time.sleep(1)
                    
                    list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
                    if list_response.status_code == 200:
                        images = list_response.json()
                        submitted_image = next((img for img in images if img.get('image_id') == image_id), None)
                        
                        if submitted_image:
                            print("   ✓ SUCCESS: Image still exists after submission!")
                            caption = submitted_image.get('caption')
                            if caption:
                                print(f"   ✓ Caption edited: {caption.get('edited', 'N/A')}")
                                print(f"   ✓ Accuracy: {caption.get('accuracy', 'N/A')}")
                            else:
                                print("   ✗ ERROR: Caption not found in submitted image!")
                        else:
                            print("   ✗ ERROR: Image was deleted after submission!")
                            return False
                    
                    # Clean up
                    print("6. Cleaning up...")
                    delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                    print(f"   Delete status: {delete_response.status_code}")
                    
                else:
                    print(f"   ✗ ERROR: Caption submission failed: {submit_response.text}")
            else:
                print(f"   ✗ ERROR: Caption creation failed: {caption_response.text}")
        else:
            print(f"   ✗ ERROR: Upload failed: {upload_response.text}")
            
    except Exception as e:
        print(f"   ✗ ERROR: Deletion logic test failed: {e}")

if __name__ == "__main__":
    test_database_connection()
    test_crud_functions()
    test_complete_upload_flow()
    test_deletion_logic() 