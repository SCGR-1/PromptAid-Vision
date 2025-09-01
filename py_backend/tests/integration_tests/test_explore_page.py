#!/usr/bin/env python3
"""Tests for the explore page functionality"""

import io
import requests
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal
from app import crud, models, storage

def test_explore_page_endpoints():
    """Test the explore page API endpoints"""
    print("=== Testing Explore Page Endpoints ===")
    
    base_url = "http://localhost:8000/api"
    
    endpoints = [
        "/sources",
        "/types", 
        "/regions",
        "/countries",
        "/spatial-references",
        "/image-types"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}")
            print(f"GET {endpoint}: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"  + {len(data)} items returned")
            else:
                print(f"  - Failed: {response.text}")
        except Exception as e:
            print(f"  - Error: {e}")

def test_images_list_endpoint():
    """Test the images list endpoint"""
    print("\n=== Testing Images List Endpoint ===")
    
    try:
        response = requests.get("http://localhost:8000/api/images/")
        print(f"GET /api/images/: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  + {len(data)} images returned")
            
            if data:
                first_image = data[0]
                required_fields = ['image_id', 'file_key', 'source', 'type', 'image_url']
                for field in required_fields:
                    if field in first_image:
                        print(f"  + {field}: {first_image[field]}")
                    else:
                        print(f"  - Missing field: {field}")
        else:
            print(f"  - Failed: {response.text}")
            
    except Exception as e:
        print(f"  - Error: {e}")

def test_image_detail_endpoint():
    """Test the image detail endpoint"""
    print("\n=== Testing Image Detail Endpoint ===")
    
    try:
        response = requests.get("http://localhost:8000/api/images/")
        if response.status_code == 200:
            images = response.json()
            if images:
                image_id = images[0]['image_id']
                
                detail_response = requests.get(f"http://localhost:8000/api/images/{image_id}")
                print(f"GET /api/images/{image_id}: {detail_response.status_code}")
                
                if detail_response.status_code == 200:
                    image_detail = detail_response.json()
                    print(f"  + Image detail retrieved")
                    print(f"  + Image ID: {image_detail.get('image_id')}")
                    print(f"  + Source: {image_detail.get('source')}")
                    print(f"  + Type: {image_detail.get('type')}")
                else:
                    print(f"  - Failed: {detail_response.text}")
            else:
                print("  ! No images available to test")
        else:
            print(f"  - Failed to get images list: {response.text}")
            
    except Exception as e:
        print(f"  - Error: {e}")

def test_image_file_endpoint():
    """Test the image file serving endpoint"""
    print("\n=== Testing Image File Endpoint ===")
    
    try:
        response = requests.get("http://localhost:8000/api/images/")
        if response.status_code == 200:
            images = response.json()
            if images:
                image_id = images[0]['image_id']
                
                file_response = requests.get(f"http://localhost:8000/api/images/{image_id}/file")
                print(f"GET /api/images/{image_id}/file: {file_response.status_code}")
                
                if file_response.status_code == 200:
                    print(f"  + Image file served successfully")
                    print(f"  + Content-Type: {file_response.headers.get('content-type')}")
                    print(f"  + Content-Length: {len(file_response.content)} bytes")
                else:
                    print(f"  - Failed: {file_response.text}")
            else:
                print("  ! No images available to test")
        else:
            print(f"  - Failed to get images list: {response.text}")
            
    except Exception as e:
        print(f"  - Error: {e}")

def test_filtering_functionality():
    """Test the filtering functionality"""
    print("\n=== Testing Filtering Functionality ===")
    
    try:
        response = requests.get("http://localhost:8000/api/images/")
        if response.status_code == 200:
            images = response.json()
            if images:
                sources = list(set(img['source'] for img in images))
                print(f"  + Available sources: {sources}")
                
                if sources:
                    first_source = sources[0]
                    filtered_images = [img for img in images if img['source'] == first_source]
                    print(f"  + Filtered by source '{first_source}': {len(filtered_images)} images")
                
                types = list(set(img['type'] for img in images))
                print(f"  + Available types: {types}")
                
                if types:
                    first_type = types[0]
                    filtered_images = [img for img in images if img['type'] == first_type]
                    print(f"  + Filtered by type '{first_type}': {len(filtered_images)} images")
            else:
                print("  ! No images available to test filtering")
        else:
            print(f"  - Failed to get images list: {response.text}")
            
    except Exception as e:
        print(f"  - Error: {e}")

def test_database_consistency():
    """Test database consistency for explore page"""
    print("\n=== Testing Database Consistency ===")
    
    db = SessionLocal()
    try:
        images = db.query(models.Images).all()
        print(f"  + Total images in database: {len(images)}")
        
        captions = db.query(models.Captions).all()
        print(f"  + Total captions in database: {len(captions)}")
        
        sources = db.query(models.Source).all()
        print(f"  + Total sources: {len(sources)}")
        
        types = db.query(models.EventType).all()
        print(f"  + Total types: {len(types)}")
        
        countries = db.query(models.Country).all()
        print(f"  + Total countries: {len(countries)}")
        
        images_with_countries = db.query(models.Images).join(models.Images.countries).all()
        print(f"  + Images with countries: {len(images_with_countries)}")
        
    except Exception as e:
        print(f"  - Error: {e}")
    finally:
        db.close()

def create_test_data():
    """Create test data for explore page testing"""
    print("\n=== Creating Test Data ===")
    
    db = SessionLocal()
    try:
        test_content = b"test image data for explore page"
        key = storage.upload_fileobj(io.BytesIO(test_content), "explore_test.jpg")
        
        img = crud.create_image(
            db=db,
            src="OTHER",
            type_code="OTHER",
            key=key,
            sha=crud.hash_bytes(test_content),
            countries=["US", "CA"],
            epsg="4326",
            image_type="crisis_map"
        )
        print(f"  + Created test image: {img.image_id}")
        
        caption = crud.create_caption(
            db=db,
            image_id=img.image_id,
            title="Explore Test Caption",
            prompt="Describe this crisis map for testing",
            model_code="STUB_MODEL",
            raw_json={"test": True},
            text="This is a test caption for the explore page."
        )
        print(f"  + Created test caption: {caption.image_id}")
        
        return img.image_id
        
    except Exception as e:
        print(f"  - Error creating test data: {e}")
        return None
    finally:
        db.close()

def cleanup_test_data(image_id):
    """Clean up test data"""
    if image_id:
        db = SessionLocal()
        try:
            img = db.query(models.Images).filter(models.Images.image_id == image_id).first()
            if img:
                db.delete(img)
                db.commit()
                print(f"  + Cleaned up test image: {image_id}")
        except Exception as e:
            print(f"  - Error cleaning up: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    print("Starting Explore Page Tests...")
    
    test_image_id = create_test_data()
    
    test_explore_page_endpoints()
    test_images_list_endpoint()
    test_image_detail_endpoint()
    test_image_file_endpoint()
    test_filtering_functionality()
    test_database_consistency()
    
    if test_image_id:
        cleanup_test_data(test_image_id)
    
    print("\n=== Explore Page Tests Completed ===") 