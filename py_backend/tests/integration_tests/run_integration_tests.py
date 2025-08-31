#!/usr/bin/env python3
"""Run all integration tests for the PromptAid Vision backend"""

import unittest
import sys
import os
import time

def run_integration_tests():
    """Discover and run all integration tests"""
    print("🧪 Running PromptAid Vision Integration Tests")
    print("=" * 50)

    # Add the app directory to the path
    app_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app')
    sys.path.insert(0, app_path)

    # Discover tests in the current directory
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(__file__)
    suite = loader.discover(start_dir, pattern='test_*.py')

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    start_time = time.time()

    result = runner.run(suite)

    end_time = time.time()
    duration = end_time - start_time

    # Print summary
    print("\n" + "=" * 50)
    print("INTEGRATION TEST SUMMARY")
    print("=" * 50)
    print(f"Tests Run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    print(f"Duration: {duration:.2f} seconds")

    if result.failures:
        print("\n❌ FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.split('AssertionError:')[-1].strip()}")

    if result.errors:
        print("\n❌ ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback.split('Exception:')[-1].strip()}")

    if result.skipped:
        print("\n⚠️  SKIPPED:")
        for test, reason in result.skipped:
            print(f"  - {test}: {reason}")

    if result.wasSuccessful():
        print("\n✅ SUCCESS: All integration tests passed!")
        return 0
    else:
        print(f"\n❌ FAILURE: {len(result.failures) + len(result.errors)} test(s) failed!")
        return 1

if __name__ == '__main__':
    sys.exit(run_integration_tests())
