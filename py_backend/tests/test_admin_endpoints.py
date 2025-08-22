#!/usr/bin/env python3
"""
Test admin endpoints and schema validation
"""

import requests
import json
import os

# Update this to your backend URL
BASE_URL = "http://localhost:8000"  # Change if different

def test_admin_login():
    """Test admin login"""
    print("🧪 Testing Admin Login...")
    
    # You'll need to set your admin password here or in environment
    password = os.getenv("ADMIN_PASSWORD", "your_password_here")
    
    try:
        response = requests.post(f"{BASE_URL}/api/admin/login", 
                               json={"password": password})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin login successful")
            print(f"   Token type: {data.get('token_type', 'N/A')}")
            print(f"   Expires at: {data.get('expires_at', 'N/A')}")
            return data.get('access_token')
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Admin login error: {e}")
        return None

def test_schema_endpoints(token):
    """Test schema endpoints with token"""
    if not token:
        print("❌ No token available, skipping schema tests")
        return
    
    print("\n🧪 Testing Schema Endpoints...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test get schemas
    try:
        response = requests.get(f"{BASE_URL}/api/schemas", headers=headers)
        if response.status_code == 200:
            schemas = response.json()
            print(f"✅ Get schemas successful: found {len(schemas)} schemas")
            for schema in schemas:
                print(f"   - {schema['schema_id']}: {schema['title']}")
        else:
            print(f"❌ Get schemas failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Get schemas error: {e}")
    
    # Test validation stats
    try:
        response = requests.get(f"{BASE_URL}/api/schemas/validation-stats", headers=headers)
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Validation stats successful:")
            print(f"   Total images: {stats.get('total_images', 0)}")
            print(f"   Validation passed: {stats.get('validation_passed', 0)}")
            print(f"   Validation failed: {stats.get('validation_failed', 0)}")
        else:
            print(f"❌ Validation stats failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Validation stats error: {e}")

def main():
    print("🚀 Testing Admin and Schema Endpoints")
    print("=" * 50)
    
    # Test admin login
    token = test_admin_login()
    
    # Test schema endpoints
    test_schema_endpoints(token)
    
    print(f"\n📋 Instructions:")
    print(f"1. Make sure your backend is running")
    print(f"2. Set ADMIN_PASSWORD environment variable or update the password in this script")
    print(f"3. Update BASE_URL if your backend is not on localhost:8000")

if __name__ == "__main__":
    main()
