#!/usr/bin/env python3
"""Basic unit tests to verify the testing setup"""

import unittest
import sys
import os

class TestBasicSetup(unittest.TestCase):
    """Basic tests to verify the testing environment works"""

    def test_python_version(self):
        """Test that we're running Python 3"""
        self.assertGreaterEqual(sys.version_info.major, 3)

    def test_unittest_available(self):
        """Test that unittest module is available"""
        import unittest
        self.assertIsNotNone(unittest)

    def test_mock_available(self):
        """Test that unittest.mock is available"""
        from unittest.mock import Mock, patch
        self.assertIsNotNone(Mock)
        self.assertIsNotNone(patch)

    def test_path_setup(self):
        """Test that we can access the app directory"""
        app_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app')
        self.assertTrue(os.path.exists(app_path))
        self.assertTrue(os.path.isdir(app_path))

    def test_simple_math(self):
        """Test basic arithmetic to ensure tests work"""
        self.assertEqual(2 + 2, 4)
        self.assertEqual(5 * 3, 15)
        self.assertEqual(10 / 2, 5)

    def test_string_operations(self):
        """Test string operations"""
        test_string = "Hello, World!"
        self.assertEqual(len(test_string), 13)
        self.assertIn("Hello", test_string)
        self.assertTrue(test_string.startswith("Hello"))

    def test_list_operations(self):
        """Test list operations"""
        test_list = [1, 2, 3, 4, 5]
        self.assertEqual(len(test_list), 5)
        self.assertEqual(test_list[0], 1)
        self.assertEqual(test_list[-1], 5)
        self.assertIn(3, test_list)

    def test_dict_operations(self):
        """Test dictionary operations"""
        test_dict = {"key1": "value1", "key2": "value2"}
        self.assertEqual(len(test_dict), 2)
        self.assertEqual(test_dict["key1"], "value1")
        self.assertIn("key2", test_dict)

if __name__ == '__main__':
    unittest.main()
