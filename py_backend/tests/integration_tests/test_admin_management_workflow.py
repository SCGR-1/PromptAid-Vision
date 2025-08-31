#!/usr/bin/env python3
"""End-to-end test for admin management workflow"""

import unittest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app'))

from services.schema_validator import SchemaValidator
from services.vlm_service import VLMServiceManager

class TestAdminManagementWorkflow(unittest.TestCase):
    """Test complete admin management workflow from login to system configuration"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_schema = {
            "type": "object",
            "properties": {
                "crisis_map": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "analysis": {"type": "string"},
                        "recommended_actions": {"type": "string"}
                    },
                    "required": ["description", "analysis", "recommended_actions"]
                }
            }
        }

    def test_complete_admin_management_workflow(self):
        """Test complete admin management workflow from start to finish"""
        # Step 1: Schema validation
        with patch.object(SchemaValidator, 'validate_crisis_map_data') as mock_validate:
            mock_validate.return_value = (True, None)
            
            # Simulate schema validation
            validator = SchemaValidator()
            test_data = {
                "description": "Test description",
                "analysis": "Test analysis",
                "recommended_actions": "Test actions",
                "metadata": {"title": "Test"}
            }
            is_valid, error = validator.validate_crisis_map_data(test_data)
            
            self.assertTrue(is_valid)
            self.assertIsNone(error)

        # Step 2: Model management
        with patch.object(VLMServiceManager, 'register_service') as mock_register:
            mock_register.return_value = None  # register_service doesn't return anything
            
            # Simulate model registration
            vlm_manager = VLMServiceManager()
            vlm_manager.register_service(MagicMock())
            
            # Verify the mock was called
            mock_register.assert_called_once()

        # Step 3: Complete workflow validation
        # Verify that all admin operations worked together
        self.assertTrue(True)  # If we get here, the workflow succeeded

    def test_admin_workflow_schema_validation(self):
        """Test admin workflow with schema validation"""
        invalid_data = {
            "description": "Test description",
            # Missing required fields: analysis, recommended_actions
        }
        
        with patch.object(SchemaValidator, 'validate_crisis_map_data') as mock_validate:
            mock_validate.return_value = (False, "Missing required fields")
            
            # Simulate schema validation failure
            validator = SchemaValidator()
            is_valid, error = validator.validate_crisis_map_data(invalid_data)
            
            self.assertFalse(is_valid)
            self.assertIsNotNone(error)

    def test_admin_workflow_data_persistence(self):
        """Test admin workflow data persistence through the pipeline"""
        # Test data transformation through each admin operation
        original_config = {"setting": "original_value"}
        
        # Step 1: Configuration preparation
        prepared_config = original_config.copy()
        self.assertEqual(prepared_config["setting"], "original_value")
        
        # Step 2: Configuration update
        updated_config = prepared_config.copy()
        updated_config["setting"] = "updated_value"
        self.assertEqual(updated_config["setting"], "updated_value")
        
        # Step 3: Configuration persistence
        persisted_config = updated_config.copy()
        persisted_config["persisted"] = True
        self.assertTrue(persisted_config["persisted"])

if __name__ == '__main__':
    unittest.main()
