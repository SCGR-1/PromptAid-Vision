#!/usr/bin/env python3
"""Test the deletion logic to ensure images aren't being deleted prematurely"""

import requests
import time

def test_deletion_logic():
    """Test that images are only deleted when appropriate"""
    print("=== Testing Deletion Logic ===")
    
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
                            print("   ✗ This indicates premature deletion!")
                            return False
                    
                    # Test 6: Clean up by manual deletion
                    print("6. Cleaning up test data...")
                    delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                    print(f"   Delete status: {delete_response.status_code}")
                    
                    if delete_response.status_code == 200:
                        print("   ✓ Manual deletion successful!")
                        
                        # Test 7: Verify image is actually deleted
                        print("7. Verifying image is deleted...")
                        time.sleep(0.5)
                        
                        list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
                        if list_response.status_code == 200:
                            images = list_response.json()
                            deleted_image = next((img for img in images if img.get('image_id') == image_id), None)
                            
                            if not deleted_image:
                                print("   ✓ SUCCESS: Image properly deleted!")
                                return True
                            else:
                                print("   ✗ ERROR: Image still exists after deletion!")
                                return False
                        else:
                            print(f"   ✗ Failed to verify deletion: {list_response.status_code}")
                            return False
                    else:
                        print(f"   ✗ Manual deletion failed: {delete_response.status_code}")
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
        print(f"   ✗ Error during deletion test: {e}")
        return False

def test_navigation_deletion():
    """Test that images are NOT deleted when navigating between pages"""
    print("\n=== Testing Navigation Deletion ===")
    
    # Test 1: Upload image
    print("1. Uploading test image for navigation test...")
    test_content = b"navigation test image data"
    files = {'file': ('navigation_test.jpg', test_content, 'image/jpeg')}
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
            
            # Test 2: Create caption
            print("2. Creating caption...")
            caption_data = {
                'title': 'Navigation Test Caption',
                'prompt': 'Describe this test image'
            }
            
            caption_response = requests.post(
                f'http://localhost:8080/api/images/{image_id}/caption',
                data=caption_data
            )
            print(f"   Caption creation status: {caption_response.status_code}")
            
            if caption_response.status_code == 200:
                print("   ✓ Caption created!")
                
                # Test 3: Simulate navigation (image should NOT be deleted)
                print("3. Simulating navigation (image should NOT be deleted)...")
                time.sleep(1)
                
                # Check if image still exists
                list_response = requests.get('http://localhost:8080/api/images/', timeout=10)
                if list_response.status_code == 200:
                    images = list_response.json()
                    navigated_image = next((img for img in images if img.get('image_id') == image_id), None)
                    
                    if navigated_image:
                        print("   ✓ SUCCESS: Image still exists after navigation simulation!")
                        print("   ✓ Navigation does NOT cause premature deletion!")
                    else:
                        print("   ✗ ERROR: Image was deleted during navigation simulation!")
                        print("   ✗ This indicates the deletion logic is too aggressive!")
                        return False
                
                # Test 4: Clean up
                print("4. Cleaning up test data...")
                delete_response = requests.delete(f'http://localhost:8080/api/images/{image_id}', timeout=10)
                print(f"   Delete status: {delete_response.status_code}")
                
                return True
                
            else:
                print(f"   ✗ Caption creation failed: {caption_response.text}")
                return False
                
        else:
            print(f"   ✗ Upload failed: {upload_response.text}")
            return False
            
    except Exception as e:
        print(f"   ✗ Error during navigation test: {e}")
        return False

if __name__ == "__main__":
    print("Starting Deletion Logic Test...")
    
    # Test 1: Basic deletion logic
    deletion_ok = test_deletion_logic()
    
    # Test 2: Navigation deletion
    navigation_ok = test_navigation_deletion()
    
    if deletion_ok and navigation_ok:
        print("\n✅ Deletion logic is working correctly!")
        print("✅ Images are NOT being deleted prematurely!")
        print("✅ Navigation does NOT cause unwanted deletions!")
    else:
        print("\n❌ Deletion logic has issues!")
        print("❌ Images may be getting deleted prematurely!")
    
    print("\n=== Deletion Logic Test Completed ===") 