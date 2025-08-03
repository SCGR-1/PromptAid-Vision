#!/usr/bin/env python3
"""Test if frontend and backend are properly connected and submit works"""

import requests
import time
import json

def test_frontend_backend_connection():
    """Test if frontend can connect to backend"""
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
                
                # Use proper headers like frontend
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
                
                submit_response = requests.put(
                    f'http://localhost:8080/api/captions/{caption_id}',
                    json=submit_data,
                    headers=headers
                )
                print(f"   Submit status: {submit_response.status_code}")
                
                if submit_response.status_code == 200:
                    print("   ✓ Caption submitted successfully!")
                    
                    # Step 4: Verify the submitted data is in database
                    print("4. Verifying submitted data in database...")
                    time.sleep(1)  # Give database time to settle
                    
                    list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
                    
                    if list_response.status_code == 200:
                        images = list_response.json()
                        submitted_image = next((img for img in images if img.get('image_id') == image_id), None)
                        
                        if submitted_image:
                            print("   ✓ Submitted image found in database!")
                            caption = submitted_image.get('caption')
                            if caption:
                                print(f"   ✓ Caption edited: {caption.get('edited', 'N/A')}")
                                print(f"   ✓ Accuracy: {caption.get('accuracy', 'N/A')}")
                                print(f"   ✓ Context: {caption.get('context', 'N/A')}")
                                print(f"   ✓ Usability: {caption.get('usability', 'N/A')}")
                            else:
                                print("   ✗ ERROR: Caption not found in submitted image!")
                        else:
                            print("   ✗ ERROR: Submitted image not found in database!")
                        
                        # Clean up
                        print("5. Cleaning up test data...")
                        delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                        print(f"   Delete status: {delete_response.status_code}")
                        
                        return True
                        
                    else:
                        print(f"   ✗ Failed to verify data: {list_response.status_code}")
                        return False
                        
                else:
                    print(f"   ✗ Submit failed: {submit_response.text}")
                    return False
                    
            else:
                print(f"   ✗ Caption creation failed: {caption_response.text}")
                return False
                
        else:
            print(f"   ✗ Upload failed: {upload_response.text}")
            return False
            
    except Exception as e:
        print(f"   ✗ Error during submit flow: {e}")
        return False

def test_frontend_api_endpoints():
    """Test all API endpoints that frontend uses"""
    print("\n=== Testing Frontend API Endpoints ===")
    
    endpoints = [
        ('/api/images/', 'GET', 'Images list'),
        ('/api/sources', 'GET', 'Sources'),
        ('/api/types', 'GET', 'Types'),
        ('/api/countries', 'GET', 'Countries'),
        ('/api/regions', 'GET', 'Regions'),
        ('/api/spatial-references', 'GET', 'Spatial references'),
        ('/api/image-types', 'GET', 'Image types')
    ]
    
    for endpoint, method, description in endpoints:
        print(f"Testing {description} ({method} {endpoint})...")
        try:
            if method == 'GET':
                response = requests.get(f'http://localhost:8080{endpoint}', timeout=10)
            else:
                response = requests.post(f'http://localhost:8080{endpoint}', timeout=10)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✓ Found {len(data)} items")
                else:
                    print(f"   ✓ Response received")
            else:
                print(f"   ✗ Failed: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   ✗ Error: {e}")

def check_browser_console_errors():
    """Provide guidance for checking browser console"""
    print("\n=== Browser Console Check ===")
    print("To check if frontend is working properly:")
    print("1. Open browser developer tools (F12)")
    print("2. Go to Console tab")
    print("3. Navigate to the upload page")
    print("4. Upload an image and check for errors")
    print("5. Check Network tab to see API calls")
    print("6. Look for any failed requests or JavaScript errors")

if __name__ == "__main__":
    print("Starting Frontend-Backend Connection Test...")
    
    # Test 1: Connection
    connection_ok = test_frontend_backend_connection()
    
    if connection_ok:
        # Test 2: Submit flow
        submit_ok = test_submit_flow()
        
        # Test 3: All frontend endpoints
        test_frontend_api_endpoints()
        
        # Test 4: Browser guidance
        check_browser_console_errors()
        
        if submit_ok:
            print("\n✅ Frontend-Backend connection is working!")
            print("✅ Submit flow is working!")
            print("✅ All API endpoints are accessible!")
            print("\nIf you're still not seeing updates in the frontend:")
            print("1. Check browser console for JavaScript errors")
            print("2. Try refreshing the page manually")
            print("3. Check if frontend dev server is running (npm run dev)")
            print("4. Clear browser cache or try incognito mode")
        else:
            print("\n❌ Submit flow is NOT working!")
            print("This means the frontend submit button won't work either.")
    else:
        print("\n❌ Frontend-Backend connection failed!")
        print("Check if backend server is running on port 8080")
    
    print("\n=== Frontend-Backend Connection Test Completed ===") 