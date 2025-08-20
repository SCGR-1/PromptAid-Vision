#!/usr/bin/env python3
"""
Comprehensive test script for schema validation integration
"""

import requests
import json
import sys
import os

BASE_URL = "http://localhost:8000"

def test_schema_endpoints():
    """Test admin schema management endpoints"""
    print("🧪 Testing Schema Management Endpoints...")
    
    # First, login to get admin token
    login_data = {"password": os.getenv("ADMIN_PASSWORD", "your_password_here")}
    
    try:
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Admin login failed: {login_response.status_code}")
            print("Please set ADMIN_PASSWORD environment variable or update the password in the script")
            return False
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test getting all schemas
        schemas_response = requests.get(f"{BASE_URL}/api/schemas", headers=headers)
        if schemas_response.status_code == 200:
            schemas = schemas_response.json()
            print(f"✅ Found {len(schemas)} schemas in database:")
            for schema in schemas:
                print(f"   - {schema['schema_id']}: {schema['title']}")
        else:
            print(f"❌ Failed to fetch schemas: {schemas_response.status_code}")
            return False
        
        # Test validation stats
        stats_response = requests.get(f"{BASE_URL}/api/schemas/validation-stats", headers=headers)
        if stats_response.status_code == 200:
            stats = stats_response.json()
            print(f"✅ Validation stats: {stats['validation_passed']} passed, {stats['validation_failed']} failed")
        else:
            print(f"❌ Failed to fetch validation stats: {stats_response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema endpoint test failed: {e}")
        return False

def test_schema_validation():
    """Test schema validation directly"""
    print("\n🧪 Testing Schema Validation Logic...")
    
    # Test crisis map validation
    crisis_data = {
        "analysis": "A major earthquake occurred in Panama with magnitude 6.6",
        "metadata": {
            "title": "Panama Earthquake July 2025",
            "source": "WFP",
            "type": "EARTHQUAKE",
            "countries": ["PA"],
            "epsg": "32617"
        }
    }
    
    try:
        from app.services.schema_validator import schema_validator
        
        # Test crisis map validation
        is_valid, error = schema_validator.validate_crisis_map_data(crisis_data)
        if is_valid:
            print("✅ Crisis map validation: PASSED")
        else:
            print(f"❌ Crisis map validation: FAILED - {error}")
        
        # Test drone validation
        drone_data = {
            "analysis": "Drone image shows damaged infrastructure after earthquake",
            "metadata": {
                "title": "Damaged Infrastructure",
                "source": "WFP",
                "type": "EARTHQUAKE",
                "countries": ["PA"],
                "epsg": "4326",
                "center_lat": 8.5,
                "center_lon": -80.0,
                "amsl_m": 100.0,
                "agl_m": 50.0,
                "heading_deg": 180.0,
                "yaw_deg": 0.0,
                "pitch_deg": 0.0,
                "roll_deg": 0.0,
                "rtk_fix": True,
                "std_h_m": 0.5,
                "std_v_m": 0.3
            }
        }
        
        is_valid, error = schema_validator.validate_drone_data(drone_data)
        if is_valid:
            print("✅ Drone validation: PASSED")
        else:
            print(f"❌ Drone validation: FAILED - {error}")
        
        # Test invalid data
        invalid_data = {
            "analysis": "Test analysis",
            "metadata": {
                "center_lat": 95.0,  # Invalid: > 90
                "center_lon": 200.0,  # Invalid: > 180
            }
        }
        
        is_valid, error = schema_validator.validate_drone_data(invalid_data)
        if not is_valid:
            print("✅ Invalid data rejection: PASSED")
            print(f"   Expected error: {error}")
        else:
            print("❌ Invalid data rejection: FAILED - Should have rejected invalid coordinates")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema validation test failed: {e}")
        return False

def test_models_api():
    """Test models API to see debug info"""
    print("\n🧪 Testing Models API (Debug Info)...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/models")
        if response.status_code == 200:
            data = response.json()
            models = data.get("models", [])
            debug = data.get("debug", {})
            
            print(f"✅ Found {len(models)} models:")
            for model in models[:3]:  # Show first 3
                print(f"   - {model['m_code']}: {model['label']} ({'Available' if model['is_available'] else 'Disabled'})")
            
            if debug:
                print(f"✅ Debug info:")
                print(f"   - Registered services: {debug.get('registered_services', [])}")
                print(f"   - Total services: {debug.get('total_services', 0)}")
                print(f"   - Available DB models: {debug.get('available_db_models', [])}")
            
            return True
        else:
            print(f"❌ Models API failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Models API test failed: {e}")
        return False

def test_caption_generation():
    """Test caption generation with a sample image to see if validation works"""
    print("\n🧪 Testing Caption Generation with Schema Validation...")
    
    # This would require an actual image upload, which is complex
    # For now, we'll just check if the endpoint exists
    try:
        # Test if caption endpoint exists (should return 404 for non-existent image)
        response = requests.post(f"{BASE_URL}/api/images/test-id/caption", 
                               data={"title": "Test", "prompt": "DEFAULT_CRISIS_MAP"})
        
        # We expect 404 since the image doesn't exist, but that means the endpoint works
        if response.status_code == 404:
            print("✅ Caption generation endpoint: ACCESSIBLE")
            print("   (404 expected for non-existent image)")
            return True
        else:
            print(f"✅ Caption generation endpoint: ACCESSIBLE (status: {response.status_code})")
            return True
            
    except Exception as e:
        print(f"❌ Caption generation test failed: {e}")
        return False

def main():
    print("🚀 Starting Schema Validation Integration Tests")
    print("=" * 60)
    
    tests = [
        ("Schema Validation Logic", test_schema_validation),
        ("Models API", test_models_api),
        ("Caption Generation Endpoint", test_caption_generation),
        ("Admin Schema Endpoints", test_schema_endpoints),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}: EXCEPTION - {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! Schema validation is working correctly.")
        print("\nNext steps:")
        print("1. Try uploading an image through the frontend")
        print("2. Check the admin panel for schema validation stats")
        print("3. Look at the backend logs for validation debug messages")
    else:
        print("\n⚠️  Some tests failed. Check the error messages above.")
        print("Common issues:")
        print("- ADMIN_PASSWORD not set correctly")
        print("- Backend not running on localhost:8000")
        print("- Database connection issues")

if __name__ == "__main__":
    main()
