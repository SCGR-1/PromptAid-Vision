#!/usr/bin/env python3
"""
Test script for schema validation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.schema_validator import schema_validator

def test_crisis_map_validation():
    """Test crisis map data validation"""
    print("Testing Crisis Map Validation...")
    
    # Valid crisis map data
    valid_data = {
        "analysis": "A major earthquake occurred in Panama with magnitude 6.6",
        "metadata": {
            "title": "Panama Earthquake July 2025",
            "source": "WFP",
            "type": "EARTHQUAKE",
            "countries": ["PA"],
            "epsg": "32617"
        }
    }
    
    is_valid, error = schema_validator.validate_crisis_map_data(valid_data)
    print(f"✓ Valid data: {is_valid}, Error: {error}")
    
    # Invalid crisis map data (missing required fields)
    invalid_data = {
        "analysis": "A major earthquake occurred in Panama",
        "metadata": {
            "title": "Panama Earthquake",
            # Missing source, type, countries, epsg
        }
    }
    
    is_valid, error = schema_validator.validate_crisis_map_data(invalid_data)
    print(f"✗ Invalid data: {is_valid}, Error: {error}")
    
    # Test data cleaning
    cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(valid_data, "crisis_map")
    print(f"✓ Cleaned data: {is_valid}, Error: {error}")
    if is_valid:
        print(f"  Cleaned metadata: {cleaned_data['metadata']}")

def test_drone_validation():
    """Test drone data validation"""
    print("\nTesting Drone Validation...")
    
    # Valid drone data
    valid_data = {
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
    
    is_valid, error = schema_validator.validate_drone_data(valid_data)
    print(f"✓ Valid drone data: {is_valid}, Error: {error}")
    
    # Invalid drone data (invalid coordinate values)
    invalid_data = {
        "analysis": "Drone image shows damaged infrastructure",
        "metadata": {
            "title": "Damaged Infrastructure",
            "center_lat": 95.0,  # Invalid: > 90
            "center_lon": 200.0,  # Invalid: > 180
            "heading_deg": 400.0,  # Invalid: > 360
        }
    }
    
    is_valid, error = schema_validator.validate_drone_data(invalid_data)
    print(f"✗ Invalid drone data: {is_valid}, Error: {error}")
    
    # Test data cleaning
    cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(valid_data, "drone_image")
    print(f"✓ Cleaned drone data: {is_valid}, Error: {error}")
    if is_valid:
        print(f"  Cleaned metadata keys: {list(cleaned_data['metadata'].keys())}")

def test_vlm_response_format():
    """Test handling of different VLM response formats"""
    print("\nTesting VLM Response Format Handling...")
    
    # Test content-wrapped format
    content_wrapped = {
        "content": {
            "analysis": "Test analysis",
            "metadata": {
                "title": "Test Title",
                "source": "WFP",
                "type": "EARTHQUAKE",
                "countries": ["PA"],
                "epsg": "4326"
            }
        }
    }
    
    cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(content_wrapped, "crisis_map")
    print(f"✓ Content-wrapped format: {is_valid}, Error: {error}")
    
    # Test string content format
    string_content = {
        "content": '{"analysis": "Test", "metadata": {"title": "Test", "source": "WFP", "type": "EARTHQUAKE", "countries": ["PA"], "epsg": "4326"}}'
    }
    
    cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(string_content, "crisis_map")
    print(f"✓ String content format: {is_valid}, Error: {error}")

if __name__ == "__main__":
    print("Schema Validation Test Suite")
    print("=" * 40)
    
    try:
        test_crisis_map_validation()
        test_drone_validation()
        test_vlm_response_format()
        print("\n✅ All tests completed!")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
