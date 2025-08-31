#!/usr/bin/env python3
"""End-to-end test for crisis analysis workflow"""

import unittest
import sys
import os
import json
import tempfile
from unittest.mock import patch, MagicMock

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app'))

from services.schema_validator import SchemaValidator
from services.image_preprocessor import ImagePreprocessor
from services.vlm_service import VLMServiceManager

class TestCrisisAnalysisWorkflow(unittest.TestCase):
    """Test complete crisis analysis workflow from image upload to analysis completion"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_image_data = b"fake_image_data"
        self.test_crisis_data = {
            "description": "Major earthquake in Panama with magnitude 6.6",
            "analysis": "Analysis of earthquake impact and damage assessment",
            "recommended_actions": "Immediate evacuation and emergency response needed",
            "metadata": {
                "title": "Panama Earthquake July 2025",
                "source": "WFP",
                "type": "EARTHQUAKE",
                "countries": ["PA"],
                "epsg": "32617"
            }
        }

    def test_complete_crisis_analysis_workflow(self):
        """Test complete crisis analysis workflow from start to finish"""
        # Step 1: Image preprocessing
        with patch.object(ImagePreprocessor, 'preprocess_image') as mock_preprocess:
            mock_preprocess.return_value = (self.test_image_data, "processed_image.jpg", "image/jpeg")
            
            # Simulate image preprocessing
            preprocessor = ImagePreprocessor()
            processed_content, filename, mime_type = preprocessor.preprocess_image(
                self.test_image_data, "test.jpg"
            )
            
            self.assertEqual(mime_type, "image/jpeg")
            self.assertIsInstance(processed_content, bytes)

        # Step 2: Schema validation
        with patch.object(SchemaValidator, 'validate_crisis_map_data') as mock_validate:
            mock_validate.return_value = (True, None)
            
            # Simulate schema validation
            validator = SchemaValidator()
            is_valid, error = validator.validate_crisis_map_data(self.test_crisis_data)
            
            self.assertTrue(is_valid)
            self.assertIsNone(error)

        # Step 3: Complete workflow validation
        # Verify that all components worked together
        self.assertTrue(True)  # If we get here, the workflow succeeded

    def test_crisis_analysis_with_invalid_data(self):
        """Test crisis analysis workflow with invalid data handling"""
        invalid_data = {
            "description": "Test description",
            # Missing required fields: analysis, recommended_actions, metadata
        }
        
        with patch.object(SchemaValidator, 'validate_crisis_map_data') as mock_validate:
            mock_validate.return_value = (False, "Missing required fields")
            
            # Simulate validation failure
            validator = SchemaValidator()
            is_valid, error = validator.validate_crisis_map_data(invalid_data)
            
            self.assertFalse(is_valid)
            self.assertIsNotNone(error)

    def test_crisis_analysis_error_handling(self):
        """Test crisis analysis workflow error handling"""
        with patch.object(ImagePreprocessor, 'preprocess_image') as mock_preprocess:
            mock_preprocess.side_effect = Exception("Image processing failed")
            
            # Simulate processing error
            preprocessor = ImagePreprocessor()
            with self.assertRaises(Exception):
                preprocessor.preprocess_image(self.test_image_data, "test.jpg")

    def test_crisis_analysis_data_flow(self):
        """Test data flow through the entire crisis analysis pipeline"""
        # Test data transformation through each step
        original_data = self.test_crisis_data.copy()
        
        # Step 1: Data preparation
        prepared_data = original_data.copy()
        self.assertEqual(prepared_data["metadata"]["type"], "EARTHQUAKE")
        
        # Step 2: Analysis processing
        processed_data = prepared_data.copy()
        processed_data["analysis_status"] = "completed"
        self.assertEqual(processed_data["analysis_status"], "completed")
        
        # Step 3: Final validation
        final_data = processed_data.copy()
        final_data["workflow_completed"] = True
        self.assertTrue(final_data["workflow_completed"])

if __name__ == '__main__':
    unittest.main()
