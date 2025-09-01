#!/usr/bin/env python3
"""Test the complete upload flow: upload → create caption → submit caption"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
import time
import io
from app.database import SessionLocal
from app import crud, models

def test_database_connection():
    """Test basic database connectivity and table creation"""
    db = SessionLocal()
    try:
        print("Testing database connection...")
        
        sources = db.query(models.Source).all()
        print(f"Found {len(sources)} sources in database")
        
        test_img = models.Images(
            file_key="test_key",
            sha256="test_sha",
            source="OTHER",
            event_type="OTHER",
            epsg="4326",
            image_type="crisis_map"
        )
        
        db.add(test_img)
        db.commit()
        print(f"Created test image with ID: {test_img.image_id}")
        
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
        
        caption = crud.create_caption(
            db=db,
            image_id=img.image_id,
            title="Test CRUD Caption",
            prompt="Test CRUD prompt",
            model_code="STUB_MODEL",
            raw_json={"test_crud": True},
            text="This is a test CRUD caption"
        )
        print(f"CRUD create_caption successful for image: {caption.image_id}")
        
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
    
    test_content = b"test image data for upload flow"
    test_filename = "test_upload.jpg"
    
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
                caption_id = caption_result['image_id']
                print(f"Caption created successfully! Caption ID: {caption_id}")
                
                print("3. Submitting caption via API...")
                submit_data = {
                    'title': 'Test Caption',
                    'edited': 'This is an edited test caption',
                    'accuracy': 85,
                    'context': 90,
                    'usability': 80
                }
                
                submit_response = requests.put(
                    f'http://localhost:8080/api/images/{image_id}/caption',
                    json=submit_data
                )
                print(f"Submit response status: {submit_response.status_code}")
                
                if submit_response.status_code == 200:
                    print("Caption submitted successfully!")
                    
                    print("4. Verifying in database...")
                    db = SessionLocal()
                    try:
                        db_caption = crud.get_caption(db, image_id)
                        if db_caption:
                            print(f"SUCCESS: Caption found in database for image: {db_caption.image_id}")
                            print(f"Title: {db_caption.title}")
                            print(f"Edited: {db_caption.edited}")
                            print(f"Accuracy: {db_caption.accuracy}")
                        else:
                            print("ERROR: Caption not found in database")
                    finally:
                        db.close()
                else:
                    print(f"Caption submission failed: {submit_response.text}")
            else:
                print(f"Caption creation failed: {caption_response.text}")
        else:
            print(f"Upload failed: {response.text}")
            
    except Exception as e:
        print(f"Upload flow test failed: {e}")
        import traceback
        traceback.print_exc()

def test_deletion_logic():
    """Test the deletion logic for images"""
    print("=== Testing Deletion Logic ===")
    
    test_content = b"test image data for deletion test"
    test_filename = "test_deletion.jpg"
    
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
            
            print("2. Creating caption via API...")
            caption_data = {
                'title': 'Test Caption for Deletion',
                'prompt': 'Describe this test image'
            }
            
            caption_response = requests.post(
                f'http://localhost:8080/api/images/{image_id}/caption',
                data=caption_data
            )
            print(f"Caption response status: {caption_response.status_code}")
            
            if caption_response.status_code == 200:
                print("Caption created successfully!")
                
                print("3. Testing image deletion...")
                delete_response = requests.delete(
                    f'http://localhost:8080/api/images/{image_id}'
                )
                print(f"Delete response status: {delete_response.status_code}")
                
                if delete_response.status_code == 200:
                    print("Image deleted successfully!")
                    
                    print("4. Verifying image deletion...")
                    db = SessionLocal()
                    try:
                        db_image = crud.get_image(db, image_id)
                        if db_image:
                            print("ERROR: Image still exists when it should have been deleted")
                        else:
                            print("SUCCESS: Image completely removed from database")
                    finally:
                        db.close()
                else:
                    print(f"Image deletion failed: {delete_response.text}")
            else:
                print(f"Caption creation failed: {caption_response.text}")
        else:
            print(f"Upload failed: {response.text}")
            
    except Exception as e:
        print(f"Deletion logic test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_connection()
    test_crud_functions()
    test_complete_upload_flow()
    test_deletion_logic() 