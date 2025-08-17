#!/usr/bin/env python3
"""Simple test runner for PromptAid Vision"""

import subprocess
import sys
import os

def main():
    """Run the configuration test"""
    print("Running PromptAid Vision Configuration Test...")
    
    try:
        # Change to tests directory
        os.chdir('tests')
        
        # Run the config test
        result = subprocess.run([sys.executable, 'test_config.py'], 
                              capture_output=True, text=True, timeout=60)
        
        print("\n" + "="*50)
        print("CONFIGURATION TEST RESULTS")
        print("="*50)
        
        if result.returncode == 0:
            print("✅ Configuration test PASSED")
            print("\nOutput:")
            print(result.stdout)
        else:
            print("❌ Configuration test FAILED")
            if result.stdout:
                print("\nOutput:")
                print(result.stdout)
            if result.stderr:
                print("\nErrors:")
                print(result.stderr)
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Error running test: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
