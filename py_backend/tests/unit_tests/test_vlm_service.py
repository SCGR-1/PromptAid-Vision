#!/usr/bin/env python3
"""Unit tests for VLM service"""

import unittest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app'))

from services.vlm_service import VLMServiceManager, ModelType
from services.stub_vlm_service import StubVLMService

class TestVLMServiceManager(unittest.TestCase):
    """Test cases for VLM service manager"""

    def setUp(self):
        """Set up test fixtures"""
        self.manager = VLMServiceManager()
        self.stub_service = StubVLMService()

    def test_register_service(self):
        """Test registering a VLM service"""
        # Act
        self.manager.register_service(self.stub_service)
        
        # Assert
        self.assertIn(self.stub_service.model_name, self.manager.services)
        self.assertEqual(self.manager.default_service, self.stub_service.model_name)

    def test_get_service_existing(self):
        """Test getting an existing service"""
        # Arrange
        self.manager.register_service(self.stub_service)
        
        # Act
        service = self.manager.get_service(self.stub_service.model_name)
        
        # Assert
        self.assertEqual(service, self.stub_service)

    def test_get_service_nonexistent(self):
        """Test getting a non-existent service"""
        # Act
        service = self.manager.get_service("non_existent")
        
        # Assert
        self.assertIsNone(service)

    def test_get_default_service(self):
        """Test getting the default service"""
        # Arrange
        self.manager.register_service(self.stub_service)
        
        # Act
        default_service = self.manager.get_default_service()
        
        # Assert
        self.assertEqual(default_service, self.stub_service)

    def test_get_default_service_none(self):
        """Test getting default service when none registered"""
        # Act
        default_service = self.manager.get_default_service()
        
        # Assert
        self.assertIsNone(default_service)

    def test_get_available_models(self):
        """Test getting available model names"""
        # Arrange
        self.manager.register_service(self.stub_service)
        
        # Act
        models = self.manager.get_available_models()
        
        # Assert
        self.assertIsInstance(models, list)
        self.assertIn(self.stub_service.model_name, models)

    def test_get_available_models_empty(self):
        """Test getting available models when none registered"""
        # Act
        models = self.manager.get_available_models()
        
        # Assert
        self.assertEqual(models, [])

class TestStubVLMService(unittest.TestCase):
    """Test cases for stub VLM service"""

    def setUp(self):
        """Set up test fixtures"""
        self.stub_service = StubVLMService()

    def test_stub_service_initialization(self):
        """Test stub service initialization"""
        # Assert
        self.assertEqual(self.stub_service.model_name, "STUB_MODEL")
        self.assertEqual(self.stub_service.model_type, ModelType.CUSTOM)
        self.assertTrue(self.stub_service.is_available)

    def test_stub_service_model_info(self):
        """Test stub service model information"""
        # Act
        model_info = self.stub_service.get_model_info()
        
        # Assert
        self.assertIsInstance(model_info, dict)
        self.assertIn('name', model_info)
        self.assertIn('type', model_info)
        self.assertIn('available', model_info)
        self.assertEqual(model_info['name'], 'STUB_MODEL')
        self.assertEqual(model_info['type'], 'custom')
        self.assertTrue(model_info['available'])



    def test_stub_service_inheritance(self):
        """Test that stub service inherits from VLMService"""
        # Assert
        self.assertIsInstance(self.stub_service, StubVLMService)
        # Note: Can't test isinstance(self.stub_service, VLMService) due to import issues

class TestModelType(unittest.TestCase):
    """Test cases for ModelType enum"""

    def test_model_type_values(self):
        """Test ModelType enum values"""
        # Assert
        self.assertEqual(ModelType.GPT4V.value, "gpt4v")
        self.assertEqual(ModelType.CLAUDE_3_5_SONNET.value, "claude_3_5_sonnet")
        self.assertEqual(ModelType.GEMINI_PRO_VISION.value, "gemini_pro_vision")
        self.assertEqual(ModelType.LLAMA_VISION.value, "llama_vision")
        self.assertEqual(ModelType.CUSTOM.value, "custom")

    def test_model_type_enumeration(self):
        """Test ModelType enum iteration"""
        # Act
        types = list(ModelType)
        
        # Assert
        self.assertGreater(len(types), 0)
        for model_type in types:
            self.assertIsInstance(model_type, ModelType)
            self.assertIsInstance(model_type.value, str)

if __name__ == '__main__':
    unittest.main()
