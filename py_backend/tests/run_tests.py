#!/usr/bin/env python3
"""Test runner for all backend tests"""

import sys
import os
import subprocess
import time

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def run_test(test_name, test_file):
    """Run a specific test file"""
    print(f"\n{'='*60}")
    print(f"Running {test_name}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run([
            sys.executable, 
            os.path.join(os.path.dirname(__file__), test_file)
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✓ Test completed successfully")
            print(result.stdout)
        else:
            print("✗ Test failed")
            print(result.stdout)
            print(result.stderr)
            
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("✗ Test timed out")
        return False
    except Exception as e:
        print(f"✗ Error running test: {e}")
        return False

def check_server_running():
    """Check if the FastAPI server is running"""
    try:
        import requests
        response = requests.get("http://localhost:8000/docs", timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Run all tests"""
    print("Starting Backend Test Suite")
    print("="*60)
    
    # Check if server is running
    print("Checking if FastAPI server is running...")
    if not check_server_running():
        print("⚠ FastAPI server is not running on http://localhost:8000")
        print("  Some tests may fail. Start the server with:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print()
    
    # Define test files and their descriptions
    tests = [
        ("Database Connection Test", "test_upload.py"),
        ("Storage Configuration Test", "test_storage.py"),
        ("Direct Upload Test", "test_direct_upload.py"),
        ("Full Upload Flow Test", "test_full_upload.py"),
        ("Upload Flow Debug Test", "test_upload_flow.py"),
        ("Explore Page Test", "test_explore_page.py"),
    ]
    
    results = []
    
    for test_name, test_file in tests:
        success = run_test(test_name, test_file)
        results.append((test_name, success))
    
    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = 0
    failed = 0
    
    for test_name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {test_name}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n❌ {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 