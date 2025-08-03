#!/usr/bin/env python3
"""Test the metadata update endpoint"""

import requests

def test_metadata_update():
    # First, get a list of images
    print("Getting images...")
    r = requests.get('http://localhost:8080/api/images/')
    print(f"Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        print(f"Found {len(data)} images")
        
        if data:
            image_id = data[0]['image_id']
            print(f"Testing with image ID: {image_id}")
            
            # Test the metadata update with valid values
            metadata = {
                'source': 'PDC',
                'type': 'FLOOD', 
                'epsg': '4326',
                'image_type': 'crisis_map',
                'countries': []
            }
            
            r2 = requests.put(f'http://localhost:8080/api/images/{image_id}', json=metadata)
            print(f"PUT Status: {r2.status_code}")
            print(f"PUT Response: {r2.text}")
        else:
            print("No images found")
    else:
        print(f"Failed to get images: {r.text}")

if __name__ == "__main__":
    test_metadata_update() 