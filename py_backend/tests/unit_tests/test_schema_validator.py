#!/usr/bin/env python3
"""Unit tests for schema validator service"""

import unittest
from unittest.mock import Mock, patch
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app'))

from services.schema_validator import SchemaValidator

class TestSchemaValidator(unittest.TestCase):
    """Test cases for schema validator service"""

    def setUp(self):
        """Set up test fixtures"""
        self.schema_validator = SchemaValidator()
        
        self.valid_crisis_map_data = {
            "description": "A major earthquake occurred in Panama with magnitude 6.6",
            "analysis": "Analysis of the earthquake impact and damage assessment",
            "recommended_actions": "Immediate evacuation and emergency response needed",
            "metadata": {
                "title": "Panama Earthquake July 2025",
                "source": "WFP",
                "type": "EARTHQUAKE",
                "countries": ["PA"],
                "epsg": "32617"
            }
        }
        
        self.valid_drone_data = {
            "description": "Aerial view of flood damage in Bangladesh",
            "analysis": "Analysis of flood damage and affected areas",
            "recommended_actions": "Coordinate relief efforts and assess infrastructure damage",
            "metadata": {
                "title": "Bangladesh Flood Assessment",
                "source": "IFRC",
                "type": "FLOOD",
                "countries": ["BD"],
                "epsg": "4326"
            }
        }

    def test_validate_crisis_map_data_valid(self):
        """Test validation of valid crisis map data"""
        is_valid, error = self.schema_validator.validate_crisis_map_data(self.valid_crisis_map_data)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_crisis_map_data_missing_analysis(self):
        """Test validation of crisis map data missing analysis"""
        invalid_data = {
            "description": "Test description",
            "recommended_actions": "Test actions",
            "metadata": {
                "title": "Test",
                "source": "WFP",
                "type": "EARTHQUAKE",
                "countries": ["PA"],
                "epsg": "32617"
            }
        }
        is_valid, error = self.schema_validator.validate_crisis_map_data(invalid_data)
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_validate_crisis_map_data_missing_metadata(self):
        """Test validation of crisis map data missing metadata"""
        invalid_data = {
            "description": "Test description",
            "analysis": "Test analysis",
            "recommended_actions": "Test actions"
        }
        is_valid, error = self.schema_validator.validate_crisis_map_data(invalid_data)
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_validate_crisis_map_data_missing_required_metadata_fields(self):
        """Test validation of crisis map data missing required metadata fields"""
        invalid_data = {
            "description": "Test description",
            "analysis": "Test analysis",
            "recommended_actions": "Test actions",
            "metadata": {
                "title": "Test",
                # Missing source, type, countries, epsg
            }
        }
        is_valid, error = self.schema_validator.validate_crisis_map_data(invalid_data)
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_validate_drone_data_valid(self):
        """Test validation of valid drone data"""
        is_valid, error = self.schema_validator.validate_drone_data(self.valid_drone_data)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_drone_data_missing_analysis(self):
        """Test validation of drone data missing analysis"""
        invalid_data = {
            "description": "Test description",
            "recommended_actions": "Test actions",
            "metadata": {
                "title": "Test",
                "source": "IFRC",
                "type": "FLOOD",
                "countries": ["BD"],
                "epsg": "4326"
            }
        }
        is_valid, error = self.schema_validator.validate_drone_data(invalid_data)
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_clean_and_validate_crisis_map_data(self):
        """Test cleaning and validation of crisis map data"""
        cleaned_data, is_valid, error = self.schema_validator.clean_and_validate_data(
            self.valid_crisis_map_data, "crisis_map"
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        self.assertIn("metadata", cleaned_data)
        self.assertIn("countries", cleaned_data["metadata"])

    def test_clean_and_validate_drone_data(self):
        """Test cleaning and validation of drone data"""
        cleaned_data, is_valid, error = self.schema_validator.clean_and_validate_data(
            self.valid_drone_data, "drone_image"
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        self.assertIn("metadata", cleaned_data)
        self.assertIn("countries", cleaned_data["metadata"])

    def test_clean_and_validate_invalid_image_type(self):
        """Test cleaning and validation with invalid image type"""
        cleaned_data, is_valid, error = self.schema_validator.clean_and_validate_data(
            self.valid_crisis_map_data, "invalid_type"
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_validate_data_by_type_crisis_map(self):
        """Test validation by type for crisis map"""
        is_valid, error = self.schema_validator.validate_data_by_type(
            self.valid_crisis_map_data, "crisis_map"
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_data_by_type_drone_image(self):
        """Test validation by type for drone image"""
        is_valid, error = self.schema_validator.validate_data_by_type(
            self.valid_drone_data, "drone_image"
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_data_by_type_invalid(self):
        """Test validation by type for invalid type"""
        is_valid, error = self.schema_validator.validate_data_by_type(
            self.valid_crisis_map_data, "invalid_type"
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_validate_against_schema_success(self):
        """Test successful schema validation"""
        schema = {
            "type": "object",
            "properties": {"test": {"type": "string"}},
            "required": ["test"]
        }
        data = {"test": "value"}
        
        is_valid, error = self.schema_validator.validate_against_schema(data, schema, "test_schema")
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_against_schema_failure(self):
        """Test failed schema validation"""
        schema = {
            "type": "object",
            "properties": {"test": {"type": "string"}},
            "required": ["test"]
        }
        data = {"wrong": "value"}
        
        is_valid, error = self.schema_validator.validate_against_schema(data, schema, "test_schema")
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

if __name__ == '__main__':
    unittest.main()
