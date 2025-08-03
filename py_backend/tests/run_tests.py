#!/usr/bin/env python3
"""Run all tests for the PromptAid Vision application"""

import subprocess
import sys
import os
import time

def run_test(test_file, description):
    """Run a single test file and report results"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"File: {test_file}")
    print(f"{'='*60}")
    
    try:
        # Change to the parent directory (py_backend) to run the test
        os.chdir(os.path.dirname(os.path.dirname(__file__)))
        
        # Run the test
        result = subprocess.run([sys.executable, f"tests/{test_file}"], 
                              capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ PASSED")
            if result.stdout:
                print("Output:")
                print(result.stdout)
        else:
            print("❌ FAILED")
            if result.stdout:
                print("Output:")
                print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("⏰ TIMEOUT - Test took too long")
        return False
    except Exception as e:
        print(f"💥 ERROR - {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting PromptAid Vision Test Suite")
    print(f"Python: {sys.executable}")
    print(f"Working Directory: {os.getcwd()}")
    
    # Define tests to run
    tests = [
        ("test_basic.py", "Basic Application Health Check"),
        ("test_api_endpoints.py", "API Endpoints Test"),
        ("test_upload_flow.py", "Complete Upload Flow Test"),
        ("test_database_operations.py", "Database Operations Test"),
        ("test_explore_page.py", "Explore Page Functionality Test")
    ]
    
    passed = 0
    failed = 0
    
    start_time = time.time()
    
    for test_file, description in tests:
        if run_test(test_file, description):
            passed += 1
        else:
            failed += 1
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Duration: {duration:.2f} seconds")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 