#!/usr/bin/env python3
"""Test all API endpoints for the application"""

import requests
import pytest

def test_images_endpoint():
    """Test the /api/images/ endpoint"""
    print("Testing /api/images/ endpoint...")
    r = requests.get('http://localhost:8080/api/images/')
    print(f"Status: {r.status_code}")
    
    assert r.status_code == 200
    data = r.json()
    print(f"Total images: {len(data)}")
    
    if data:
        sample = data[0]
        print("Sample image:")
        print(f"  Source: {sample['source']}")
        print(f"  Type: {sample['type']}")
        print(f"  Countries: {len(sample['countries']) if sample['countries'] else 0}")
        print(f"  Caption: {'has caption' if sample['caption'] else 'no caption'}")
        
        if sample['countries']:
            print(f"  Country codes: {[c['c_code'] for c in sample['countries']]}")
        
        # Verify required fields exist
        assert 'image_id' in sample
        assert 'file_key' in sample
        assert 'source' in sample
        assert 'type' in sample
        assert 'countries' in sample

def test_filter_endpoints():
    """Test all filter endpoints"""
    print("\nTesting filter endpoints...")
    endpoints = ['/api/sources', '/api/types', '/api/regions', '/api/countries']
    
    for endpoint in endpoints:
        try:
            r = requests.get(f'http://localhost:8080{endpoint}')
            data = r.json()
            print(f"{endpoint}: {r.status_code} - {len(data)} items")
            
            assert r.status_code == 200
            assert isinstance(data, list)
            
            if data:
                print(f"  Sample: {data[0]}")
                # Verify structure based on endpoint
                if 'sources' in endpoint:
                    assert 's_code' in data[0]
                    assert 'label' in data[0]
                elif 'types' in endpoint:
                    assert 't_code' in data[0]
                    assert 'label' in data[0]
                elif 'regions' in endpoint:
                    assert 'r_code' in data[0]
                    assert 'label' in data[0]
                elif 'countries' in endpoint:
                    assert 'c_code' in data[0]
                    assert 'label' in data[0]
                    assert 'r_code' in data[0]
                    
        except Exception as e:
            print(f"{endpoint}: Error - {e}")
            assert False, f"Endpoint {endpoint} failed: {e}"

def test_metadata_update():
    """Test the metadata update endpoint"""
    print("\nTesting metadata update endpoint...")
    
    # First, get a list of images
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
            
            assert r2.status_code == 200, f"Metadata update failed: {r2.text}"
        else:
            print("No images found")
            pytest.skip("No images available for metadata test")
    else:
        print(f"Failed to get images: {r.text}")
        assert False, "Failed to get images"

if __name__ == "__main__":
    test_images_endpoint()
    test_filter_endpoints()
    test_metadata_update() 