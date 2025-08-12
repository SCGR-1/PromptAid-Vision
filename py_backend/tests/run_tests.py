#!/usr/bin/env python3
"""Run all tests for the PromptAid Vision application"""

import subprocess
import sys
import os
import time

def run_test(test_file, description):
    """Run a single test file and report results"""
    print(f"\n{'='*50}")
    print(f"Running: {description}")
    print(f"File: {test_file}")
    print(f"{'='*50}")
    
    try:
        os.chdir(os.path.dirname(os.path.dirname(__file__)))
        
        result = subprocess.run([sys.executable, f"tests/{test_file}"], 
                              capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("SUCCESS: PASSED")
            if result.stdout:
                print("Output:")
                print(result.stdout)
        else:
            print("ERROR: FAILED")
            if result.stdout:
                print("Output:")
                print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("TIMEOUT: Test took too long")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    """Run all tests"""
    print("Starting PromptAid Vision Test Suite")
    print(f"Python: {sys.executable}")
    print(f"Working Directory: {os.getcwd()}")
    
    tests = [
        ("test_core.py", "Core Application Tests"),
        ("test_hf.py", "Hugging Face Integration Tests")
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
    
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print(f"{'='*50}")
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Duration: {duration:.2f} seconds")
    
    if failed == 0:
        print("\nSUCCESS: All tests passed!")
        return 0
    else:
        print(f"\nWARNING: {failed} test(s) failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 