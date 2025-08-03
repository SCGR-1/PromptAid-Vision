#!/usr/bin/env python3
"""Test the real upload flow to debug why uploaded maps aren't showing"""

import requests
import time

def test_server_running():
    """Check if the FastAPI server is running"""
    print("=== Testing Server Status ===")
    
    try:
        # Test basic connectivity
        response = requests.get("http://localhost:8080/docs", timeout=5)
        print(f"Server status: {response.status_code}")
        if response.status_code == 200:
            print("✓ FastAPI server is running on port 8080")
            return True
        else:
            print("✗ Server returned unexpected status")
            return False
    except Exception as e:
        print(f"✗ Server not running on port 8080: {e}")
        return False

def test_images_endpoint():
    """Test the images list endpoint"""
    print("\n=== Testing Images Endpoint ===")
    
    try:
        response = requests.get("http://localhost:8080/api/images/", timeout=10)
        print(f"GET /api/images/ status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} images in database")
            
            if data:
                print("Sample images:")
                for i, img in enumerate(data[:3]):  # Show first 3
                    print(f"  {i+1}. {img.get('image_id', 'N/A')} - {img.get('source', 'N/A')}/{img.get('type', 'N/A')}")
            return True
        else:
            print(f"✗ Failed to get images: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing images endpoint: {e}")
        return False

def test_upload_flow():
    """Test the complete upload flow"""
    print("\n=== Testing Upload Flow ===")
    
    # Create a simple test image
    test_content = b"fake image data for testing"
    
    # Prepare upload data
    files = {'file': ('test_image.jpg', test_content, 'image/jpeg')}
    data = {
        'source': 'OTHER',
        'type': 'OTHER',
        'countries': ['US'],
        'epsg': '4326',
        'image_type': 'crisis_map'
    }
    
    try:
        print("1. Uploading image...")
        response = requests.post('http://localhost:8080/api/images/', files=files, data=data, timeout=30)
        print(f"Upload status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            image_id = result.get('image_id')
            print(f"✓ Upload successful! Image ID: {image_id}")
            
            # Wait a moment
            time.sleep(1)
            
            # Test if it appears in the list
            print("2. Checking if image appears in list...")
            list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
            
            if list_response.status_code == 200:
                images = list_response.json()
                uploaded_image = next((img for img in images if img.get('image_id') == image_id), None)
                
                if uploaded_image:
                    print("✓ SUCCESS: Uploaded image found in list!")
                    print(f"   Image details: {uploaded_image}")
                else:
                    print("✗ ERROR: Uploaded image NOT found in list!")
                    print(f"   Available IDs: {[img.get('image_id') for img in images]}")
                
                # Clean up
                print("3. Cleaning up...")
                delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                print(f"Delete status: {delete_response.status_code}")
                
            else:
                print(f"✗ Failed to get images list: {list_response.status_code}")
                
        else:
            print(f"✗ Upload failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Error during upload test: {e}")

if __name__ == "__main__":
    print("Starting Real Upload Test...")
    
    # Test 1: Check if server is running
    if not test_server_running():
        print("\n❌ Server is not running. Please start it with:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080")
        exit(1)
    
    # Test 2: Check current images
    test_images_endpoint()
    
    # Test 3: Test upload flow
    test_upload_flow()
    
    print("\n=== Test Completed ===") 