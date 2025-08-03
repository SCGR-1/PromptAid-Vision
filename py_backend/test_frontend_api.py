#!/usr/bin/env python3
"""Test if the frontend API calls are working correctly"""

import requests
import time

def test_frontend_api_calls():
    """Test the API endpoints that the frontend calls"""
    print("=== Testing Frontend API Calls ===")
    
    # Test 1: Images list endpoint (what explore page calls)
    print("1. Testing /api/images/ endpoint (explore page)...")
    try:
        response = requests.get('http://localhost:8080/api/images/', timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {len(data)} images")
            
            if data:
                print("   Sample image data:")
                sample = data[0]
                print(f"     - ID: {sample.get('image_id')}")
                print(f"     - Source: {sample.get('source')}")
                print(f"     - Type: {sample.get('type')}")
                print(f"     - Has caption: {sample.get('caption') is not None}")
                if sample.get('caption'):
                    caption = sample.get('caption')
                    print(f"     - Caption edited: {caption.get('edited', 'N/A')[:50]}...")
        else:
            print(f"   ✗ Failed: {response.text}")
            
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test 2: Sources endpoint
    print("\n2. Testing /api/sources endpoint...")
    try:
        response = requests.get('http://localhost:8080/api/sources', timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {len(data)} sources")
        else:
            print(f"   ✗ Failed: {response.text}")
            
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test 3: Types endpoint
    print("\n3. Testing /api/types endpoint...")
    try:
        response = requests.get('http://localhost:8080/api/types', timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {len(data)} types")
        else:
            print(f"   ✗ Failed: {response.text}")
            
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test 4: Countries endpoint
    print("\n4. Testing /api/countries endpoint...")
    try:
        response = requests.get('http://localhost:8080/api/countries', timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {len(data)} countries")
        else:
            print(f"   ✗ Failed: {response.text}")
            
    except Exception as e:
        print(f"   ✗ Error: {e}")

def test_upload_and_verify():
    """Test upload and immediately verify it appears in list"""
    print("\n=== Testing Upload and Immediate Verification ===")
    
    # Create test image
    test_content = b"frontend test image data"
    
    # Upload image
    print("1. Uploading test image...")
    files = {'file': ('frontend_test.jpg', test_content, 'image/jpeg')}
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
            
            # Immediately check if it appears in the list
            print("2. Checking if image appears in list immediately...")
            time.sleep(0.5)  # Small delay
            
            list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
            
            if list_response.status_code == 200:
                images = list_response.json()
                uploaded_image = next((img for img in images if img.get('image_id') == image_id), None)
                
                if uploaded_image:
                    print("   ✓ SUCCESS: Uploaded image found in list!")
                    print(f"   ✓ Image details: {uploaded_image.get('source')}/{uploaded_image.get('type')}")
                else:
                    print("   ✗ ERROR: Uploaded image NOT found in list!")
                    print(f"   ✗ Available IDs: {[img.get('image_id') for img in images]}")
                
                # Clean up
                print("3. Cleaning up...")
                delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                print(f"   Delete status: {delete_response.status_code}")
                
            else:
                print(f"   ✗ Failed to get images list: {list_response.status_code}")
                
        else:
            print(f"   ✗ Upload failed: {upload_response.text}")
            
    except Exception as e:
        print(f"   ✗ Error during upload test: {e}")

if __name__ == "__main__":
    print("Starting Frontend API Test...")
    
    # Test 1: Check all frontend API endpoints
    test_frontend_api_calls()
    
    # Test 2: Test upload and immediate verification
    test_upload_and_verify()
    
    print("\n=== Frontend API Test Completed ===") 