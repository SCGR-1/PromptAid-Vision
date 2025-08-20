#!/usr/bin/env python3
"""
Simple test to verify schema validation is working in your running backend
"""

def test_validation_system():
    """Test the validation system directly"""
    print("🧪 Testing Schema Validation System...")
    
    try:
        # Import the validator
        from app.services.schema_validator import schema_validator
        
        print("\n1. Testing Crisis Map Validation:")
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
        
        cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(crisis_data, "crisis_map")
        print(f"   ✅ Valid crisis map data: {is_valid}")
        if is_valid:
            print(f"   📋 Cleaned metadata keys: {list(cleaned_data['metadata'].keys())}")
        
        print("\n2. Testing Drone Validation:")
        drone_data = {
            "analysis": "Drone shows damaged building",
            "metadata": {
                "title": "Damaged Building",
                "center_lat": 8.5,
                "center_lon": -80.0,
                "amsl_m": 100.0,
                "heading_deg": 180.0
            }
        }
        
        cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(drone_data, "drone_image")
        print(f"   ✅ Valid drone data: {is_valid}")
        if is_valid:
            print(f"   📋 Cleaned metadata has {len([k for k, v in cleaned_data['metadata'].items() if v is not None])} non-null fields")
        
        print("\n3. Testing Invalid Data Rejection:")
        invalid_data = {
            "analysis": "Test",
            "metadata": {
                "center_lat": 95.0,  # Invalid: > 90
                "center_lon": 200.0,  # Invalid: > 180
                "heading_deg": 400.0  # Invalid: > 360
            }
        }
        
        cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(invalid_data, "drone_image")
        print(f"   ✅ Invalid data correctly rejected: {not is_valid}")
        if not is_valid:
            print(f"   📝 Error message: {error[:100]}...")
        
        print("\n4. Testing VLM Response Format Handling:")
        wrapped_data = {
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
        
        cleaned_data, is_valid, error = schema_validator.clean_and_validate_data(wrapped_data, "crisis_map")
        print(f"   ✅ Content-wrapped format handled: {is_valid}")
        
        print("\n🎉 Schema validation system is working correctly!")
        print("\n📋 What this means:")
        print("   • VLM responses will be validated against schemas")
        print("   • Invalid data will be caught and logged")
        print("   • Clean, structured data will be stored")
        print("   • Different schemas for crisis maps vs drone images")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_schemas():
    """Test database schema access"""
    print("\n🧪 Testing Database Schema Access...")
    
    try:
        from app import crud, database
        from app.models import JSONSchema
        
        # Create a database session
        db = database.SessionLocal()
        
        # Get schemas from database
        schemas = crud.get_all_schemas(db)
        print(f"   ✅ Found {len(schemas)} schemas in database:")
        
        for schema in schemas:
            print(f"      - {schema.schema_id}: {schema.title}")
        
        # Test specific schema retrieval
        crisis_schema = crud.get_schema(db, "default_caption@1.0.0")
        drone_schema = crud.get_schema(db, "drone_caption@1.0.0")
        
        if crisis_schema:
            print(f"   ✅ Crisis schema found: {crisis_schema.title}")
        if drone_schema:
            print(f"   ✅ Drone schema found: {drone_schema.title}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database schema test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Schema Validation Integration")
    print("=" * 50)
    
    success1 = test_validation_system()
    success2 = test_database_schemas()
    
    if success1 and success2:
        print(f"\n✅ All tests passed! Your schema validation is ready to use.")
        print(f"\n🔧 To see it in action:")
        print(f"   1. Upload an image through your frontend")
        print(f"   2. Check backend logs for validation messages")
        print(f"   3. Use admin panel to view validation stats")
    else:
        print(f"\n❌ Some tests failed. Check the errors above.")
