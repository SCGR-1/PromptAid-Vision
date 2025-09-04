#!/usr/bin/env python3
"""
Test script to verify thumbnail conversion works locally.
This script can be run to test the thumbnail conversion logic without affecting production data.
"""

import os
import sys
import logging
from typing import List

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Images
from app.services.thumbnail_service import ImageProcessingService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_thumbnail_service():
    """Test the thumbnail service with sample data"""
    logger.info("Testing thumbnail service...")
    
    # Test with a sample image (you can replace this with actual test data)
    sample_image_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x10\x00\x10\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9'
    
    try:
        # Test WebP thumbnail creation
        thumbnail_bytes, thumbnail_filename = ImageProcessingService.create_thumbnail(
            sample_image_data, 
            "test_image.jpg"
        )
        
        if thumbnail_bytes and thumbnail_filename:
            logger.info(f"✅ WebP thumbnail created successfully: {thumbnail_filename}")
            logger.info(f"   Thumbnail size: {len(thumbnail_bytes)} bytes")
            
            # Check if it's actually WebP format
            if thumbnail_bytes.startswith(b'RIFF') and thumbnail_bytes[8:12] == b'WEBP':
                logger.info("✅ Thumbnail is valid WebP format")
            else:
                logger.warning("⚠️ Thumbnail doesn't appear to be WebP format")
        else:
            logger.error("❌ Failed to create WebP thumbnail")
            return False
        
        # Test WebP detail image creation
        detail_bytes, detail_filename = ImageProcessingService.create_detail_image(
            sample_image_data, 
            "test_image.jpg"
        )
        
        if detail_bytes and detail_filename:
            logger.info(f"✅ WebP detail image created successfully: {detail_filename}")
            logger.info(f"   Detail image size: {len(detail_bytes)} bytes")
            
            # Check if it's actually WebP format
            if detail_bytes.startswith(b'RIFF') and detail_bytes[8:12] == b'WEBP':
                logger.info("✅ Detail image is valid WebP format")
            else:
                logger.warning("⚠️ Detail image doesn't appear to be WebP format")
        else:
            logger.error("❌ Failed to create WebP detail image")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error testing thumbnail service: {e}")
        return False

def test_database_connection():
    """Test database connection and count images"""
    logger.info("Testing database connection...")
    
    try:
        db = SessionLocal()
        image_count = db.query(Images).count()
        logger.info(f"✅ Database connection successful. Found {image_count} images.")
        db.close()
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

def main():
    """Main test function"""
    logger.info("Starting thumbnail conversion tests...")
    
    # Test 1: Thumbnail service
    if not test_thumbnail_service():
        logger.error("Thumbnail service test failed!")
        return 1
    
    # Test 2: Database connection
    if not test_database_connection():
        logger.error("Database connection test failed!")
        return 1
    
    logger.info("✅ All tests passed! Thumbnail conversion should work properly.")
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
