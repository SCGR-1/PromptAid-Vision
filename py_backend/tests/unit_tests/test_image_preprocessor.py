#!/usr/bin/env python3
"""Unit tests for image preprocessor service"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
import io
from PIL import Image

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app'))

from services.image_preprocessor import ImagePreprocessor

class TestImagePreprocessor(unittest.TestCase):
    """Test cases for image preprocessor service"""

    def setUp(self):
        """Set up test fixtures"""
        self.preprocessor = ImagePreprocessor()
        
        # Create a simple test image
        self.test_image = Image.new('RGB', (100, 100), color='red')
        self.test_image_bytes = io.BytesIO()
        self.test_image.save(self.test_image_bytes, format='JPEG')
        self.test_image_bytes.seek(0)

    def test_detect_mime_type_jpeg(self):
        """Test MIME type detection for JPEG"""
        # Arrange
        image_data = self.test_image_bytes.getvalue()
        filename = "test.jpg"
        
        # Act
        mime_type = self.preprocessor.detect_mime_type(image_data, filename)
        
        # Assert
        self.assertEqual(mime_type, "image/jpeg")

    def test_detect_mime_type_png(self):
        """Test MIME type detection for PNG"""
        # Arrange
        png_image = Image.new('RGB', (50, 50), color='blue')
        png_bytes = io.BytesIO()
        png_image.save(png_bytes, format='PNG')
        png_bytes.seek(0)
        image_data = png_bytes.getvalue()
        filename = "test.png"
        
        # Act
        mime_type = self.preprocessor.detect_mime_type(image_data, filename)
        
        # Assert
        self.assertEqual(mime_type, "image/png")

    def test_detect_mime_type_unknown(self):
        """Test MIME type detection for unknown file"""
        # Arrange
        unknown_data = b"not an image"
        filename = "test.unknown"
        
        # Act
        mime_type = self.preprocessor.detect_mime_type(unknown_data, filename)
        
        # Assert
        self.assertEqual(mime_type, "application/octet-stream")

    def test_needs_preprocessing_jpeg(self):
        """Test preprocessing check for JPEG (should not need preprocessing)"""
        # Act
        needs_preprocessing = self.preprocessor.needs_preprocessing("image/jpeg")
        
        # Assert
        self.assertFalse(needs_preprocessing)

    def test_needs_preprocessing_png(self):
        """Test preprocessing check for PNG (should not need preprocessing)"""
        # Act
        needs_preprocessing = self.preprocessor.needs_preprocessing("image/png")
        
        # Assert
        self.assertFalse(needs_preprocessing)

    def test_needs_preprocessing_pdf(self):
        """Test preprocessing check for PDF (should need preprocessing)"""
        # Act
        needs_preprocessing = self.preprocessor.needs_preprocessing("application/pdf")
        
        # Assert
        self.assertTrue(needs_preprocessing)

    def test_needs_preprocessing_heic(self):
        """Test preprocessing check for HEIC (should need preprocessing)"""
        # Act
        needs_preprocessing = self.preprocessor.needs_preprocessing("image/heic")
        
        # Assert
        self.assertTrue(needs_preprocessing)

    def test_preprocess_image_success(self):
        """Test successful image preprocessing"""
        # Arrange
        image_data = self.test_image_bytes.getvalue()
        filename = "test.jpg"
        
        # Act
        result = self.preprocessor.preprocess_image(image_data, filename)
        
        # Assert
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 3)
        processed_content, new_filename, mime_type = result
        self.assertIsInstance(processed_content, bytes)
        self.assertIsInstance(new_filename, str)
        self.assertIsInstance(mime_type, str)

    def test_preprocess_image_png_format(self):
        """Test image preprocessing with PNG format"""
        # Arrange
        image_data = self.test_image_bytes.getvalue()
        filename = "test.jpg"
        
        # Act
        result = self.preprocessor.preprocess_image(image_data, filename, target_format='PNG')
        
        # Assert
        processed_content, new_filename, mime_type = result
        self.assertIsInstance(processed_content, bytes)
        self.assertIsInstance(new_filename, str)
        self.assertGreater(len(new_filename), 0)

    def test_preprocess_image_jpeg_quality(self):
        """Test image preprocessing with JPEG quality setting"""
        # Arrange
        image_data = self.test_image_bytes.getvalue()
        filename = "test.jpg"
        
        # Act
        result = self.preprocessor.preprocess_image(image_data, filename, target_format='JPEG', quality=80)
        
        # Assert
        processed_content, new_filename, mime_type = result
        self.assertIsInstance(processed_content, bytes)
        self.assertIn('.jpg', new_filename.lower())

    def test_supported_mime_types(self):
        """Test that supported MIME types are defined"""
        # Assert
        self.assertIsInstance(self.preprocessor.SUPPORTED_IMAGE_MIME_TYPES, set)
        self.assertIn('image/jpeg', self.preprocessor.SUPPORTED_IMAGE_MIME_TYPES)
        self.assertIn('image/png', self.preprocessor.SUPPORTED_IMAGE_MIME_TYPES)
        self.assertIn('application/pdf', self.preprocessor.SUPPORTED_IMAGE_MIME_TYPES)

    def test_fitz_availability(self):
        """Test PyMuPDF availability flag"""
        # Assert
        self.assertIsInstance(self.preprocessor.FITZ_AVAILABLE, bool)

    def test_configuration_constants(self):
        """Test that configuration constants are defined"""
        # Assert
        self.assertIsInstance(self.preprocessor.PDF_ZOOM_FACTOR, float)
        self.assertIsInstance(self.preprocessor.PDF_COMPRESS_LEVEL, int)
        self.assertIsInstance(self.preprocessor.PDF_QUALITY_MODE, str)

if __name__ == '__main__':
    unittest.main()
