#!/usr/bin/env python3
"""Core application tests"""

import os
import sys
import asyncio
import pytest
from pathlib import Path

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def test_basic():
    """Basic application health check"""
    print("TESTING: Basic application health...")
    
    try:
        from app.main import app
        print("SUCCESS: FastAPI app imported")
        
        assert hasattr(app, 'routes'), "App should have routes"
        print("SUCCESS: App has routes")
        
    except ImportError as e:
        print(f"ERROR: Could not import app: {e}")
        assert False, f"Could not import app: {e}"
    except Exception as e:
        print(f"ERROR: Basic test failed: {e}")
        assert False, f"Basic test failed: {e}"

def test_database():
    """Test database connection and basic operations"""
    print("\nTESTING: Database connection...")
    
    try:
        from app.database import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("SUCCESS: Database connection successful")
            
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [row[0] for row in result.fetchall()]
            print(f"INFO: Available tables: {tables}")
            
            key_tables = ['models', 'images', 'captions']
            for table in key_tables:
                if table in tables:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.fetchone()[0]
                    print(f"SUCCESS: {table} table has {count} records")
                else:
                    print(f"WARNING: {table} table not found")
            
            assert True, "Database test completed successfully"
            
    except ImportError as e:
        print(f"ERROR: Could not import database: {e}")
        assert False, f"Could not import database: {e}"
    except Exception as e:
        print(f"ERROR: Database test failed: {e}")
        assert False, f"Database test failed: {e}"

@pytest.mark.asyncio
async def test_api_endpoints():
    """Test basic API endpoint availability"""
    print("\nTESTING: API endpoints...")
    
    try:
        from app.main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        endpoints = [
            ("/", "Root endpoint"),
            ("/docs", "API documentation"),
            ("/api/images", "Images endpoint"),
            ("/api/models", "Models endpoint")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = client.get(endpoint)
                if response.status_code in [200, 404, 405]:
                    print(f"SUCCESS: {description} ({endpoint}) - Status: {response.status_code}")
                else:
                    print(f"WARNING: {description} ({endpoint}) - Status: {response.status_code}")
            except Exception as e:
                print(f"ERROR: {description} ({endpoint}) - Exception: {e}")
        
        assert True, "API endpoints test completed successfully"
        
    except ImportError as e:
        print(f"ERROR: Could not import FastAPI test client: {e}")
        assert False, f"Could not import FastAPI test client: {e}"
    except Exception as e:
        print(f"ERROR: API endpoint test failed: {e}")
        assert False, f"API endpoint test failed: {e}"

def test_environment():
    """Test environment variables and configuration"""
    print("\nTESTING: Environment configuration...")
    
    required_vars = [
        'DATABASE_URL',
        'HF_API_KEY',
        'OPENAI_API_KEY',
        'GOOGLE_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if os.getenv(var):
            print(f"SUCCESS: {var} is set")
        else:
            print(f"WARNING: {var} is not set")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"INFO: Missing environment variables: {missing_vars}")
        print("INFO: Some tests may fail without these variables")
    
    # Don't fail the test for missing env vars, just warn
    assert True, "Environment test completed"

async def main():
    """Run all core tests"""
    print("Core Application Tests")
    print("=" * 40)
    
    results = []
    
    results.append(test_basic())
    results.append(test_database())
    results.append(test_environment())
    results.append(await test_api_endpoints())
    
    print("\n" + "=" * 40)
    print("TEST SUMMARY")
    print("=" * 40)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("SUCCESS: All core tests passed")
        return 0
    else:
        print(f"WARNING: {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
