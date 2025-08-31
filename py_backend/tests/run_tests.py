#!/usr/bin/env python3
"""Run all tests for the PromptAid Vision application"""

import subprocess
import sys
import os
import time

def run_test_directory(directory, description):
    """Run all tests in a directory and report results"""
    print(f"\n{'='*50}")
    print(f"Running: {description}")
    print(f"Directory: {directory}")
    print(f"{'='*50}")
    
    try:
        os.chdir(os.path.dirname(os.path.dirname(__file__)))
        
        # Run the directory's test runner
        result = subprocess.run([sys.executable, f"tests/{directory}/run_{directory.replace('_', '')}_tests.py"], 
                              capture_output=True, text=True, timeout=300)
        
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
        print("TIMEOUT: Tests took too long")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    """Run all tests"""
    print("Starting PromptAid Vision Test Suite")
    print(f"Python: {sys.executable}")
    print(f"Working Directory: {os.getcwd()}")
    
    # Organized test directories
    test_directories = [
        ("unit_tests", "Unit Tests"),
        ("integration_tests", "Integration Tests"),
    ]
    
    passed = 0
    failed = 0
    
    start_time = time.time()
    
    for directory, description in test_directories:
        if run_test_directory(directory, description):
            passed += 1
        else:
            failed += 1
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print(f"{'='*50}")
    print(f"Total Test Categories: {len(test_directories)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Duration: {duration:.2f} seconds")
    
    if failed == 0:
        print("\nSUCCESS: All test categories passed!")
        return 0
    else:
        print(f"\nWARNING: {failed} test category(ies) failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 