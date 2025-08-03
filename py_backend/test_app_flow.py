#!/usr/bin/env python3
"""Test the exact app upload flow to debug why uploaded maps aren't showing"""

import requests
import time

def test_exact_app_flow():
    """Test the exact app upload flow: upload → create caption → submit caption"""
    print("=== Testing Exact App Upload Flow ===")
    
    # Create test image
    test_content = b"fake image data for app flow test"
    
    # Step 1: Upload Image (like app handleGenerate)
    print("1. Uploading image (handleGenerate)...")
    files = {'file': ('app_test.jpg', test_content, 'image/jpeg')}
    data = {
        'source': 'OTHER',
        'type': 'OTHER',
        'countries': ['US'],
        'epsg': '4326',
        'image_type': 'crisis_map'
    }
    
    try:
        upload_response = requests.post('http://localhost:8080/api/images/', files=files, data=data, timeout=30)
        print(f"Upload status: {upload_response.status_code}")
        
        if upload_response.status_code == 200:
            upload_result = upload_response.json()
            image_id = upload_result.get('image_id')
            print(f"✓ Upload successful! Image ID: {image_id}")
            
            # Step 2: Create Caption (like app handleGenerate)
            print("2. Creating caption (handleGenerate)...")
            caption_data = {
                'title': 'Generated Caption',
                'prompt': 'Describe this crisis map in detail'
            }
            
            caption_response = requests.post(
                f'http://localhost:8080/api/images/{image_id}/caption',
                data=caption_data
            )
            print(f"Caption creation status: {caption_response.status_code}")
            
            if caption_response.status_code == 200:
                caption_result = caption_response.json()
                caption_id = caption_result.get('cap_id')
                print(f"✓ Caption created! Caption ID: {caption_id}")
                
                # Step 3: Submit Caption (like app handleSubmit)
                print("3. Submitting caption (handleSubmit)...")
                submit_data = {
                    'edited': 'This is a test caption for the app flow.',
                    'accuracy': 75,
                    'context': 80,
                    'usability': 70
                }
                
                submit_response = requests.put(
                    f'http://localhost:8080/api/captions/{caption_id}',
                    json=submit_data
                )
                print(f"Submit status: {submit_response.status_code}")
                
                if submit_response.status_code == 200:
                    print("✓ Caption submitted successfully!")
                    
                    # Step 4: Check if image appears in explore page list
                    print("4. Checking if image appears in explore page list...")
                    time.sleep(1)  # Give a moment for database to settle
                    
                    list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
                    
                    if list_response.status_code == 200:
                        images = list_response.json()
                        uploaded_image = next((img for img in images if img.get('image_id') == image_id), None)
                        
                        if uploaded_image:
                            print("✓ SUCCESS: Uploaded image found in explore page list!")
                            print(f"   Image ID: {uploaded_image.get('image_id')}")
                            print(f"   Source: {uploaded_image.get('source')}")
                            print(f"   Type: {uploaded_image.get('type')}")
                            print(f"   Has caption: {uploaded_image.get('caption') is not None}")
                            if uploaded_image.get('caption'):
                                print(f"   Caption: {uploaded_image.get('caption').get('edited', 'No edited caption')}")
                        else:
                            print("✗ ERROR: Uploaded image NOT found in explore page list!")
                            print(f"   Available IDs: {[img.get('image_id') for img in images]}")
                        
                        # Clean up
                        print("5. Cleaning up...")
                        delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                        print(f"Delete status: {delete_response.status_code}")
                        
                    else:
                        print(f"✗ Failed to get images list: {list_response.status_code}")
                        
                else:
                    print(f"✗ Caption submission failed: {submit_response.text}")
                    
            else:
                print(f"✗ Caption creation failed: {caption_response.text}")
                
        else:
            print(f"✗ Upload failed: {upload_response.text}")
            
    except Exception as e:
        print(f"✗ Error during app flow test: {e}")

def test_explore_page_data():
    """Test what data the explore page actually receives"""
    print("\n=== Testing Explore Page Data ===")
    
    try:
        response = requests.get('http://localhost:8080/api/images/', timeout=10)
        
        if response.status_code == 200:
            images = response.json()
            print(f"✓ Found {len(images)} images in explore page data")
            
            for i, img in enumerate(images[:5]):  # Show first 5
                print(f"  {i+1}. ID: {img.get('image_id', 'N/A')}")
                print(f"     Source: {img.get('source', 'N/A')}")
                print(f"     Type: {img.get('type', 'N/A')}")
                print(f"     Has caption: {img.get('caption') is not None}")
                if img.get('caption'):
                    caption = img.get('caption')
                    print(f"     Caption generated: {caption.get('generated', 'N/A')[:50]}...")
                    print(f"     Caption edited: {caption.get('edited', 'N/A')[:50]}...")
                print()
        else:
            print(f"✗ Failed to get explore page data: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error testing explore page data: {e}")

if __name__ == "__main__":
    print("Starting App Flow Test...")
    
    # Test 1: Check current explore page data
    test_explore_page_data()
    
    # Test 2: Test exact app flow
    test_exact_app_flow()
    
    # Test 3: Check explore page data again
    test_explore_page_data()
    
    print("\n=== App Flow Test Completed ===") 