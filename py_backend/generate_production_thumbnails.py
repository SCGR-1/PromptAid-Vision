#!/usr/bin/env python3
"""
Script to convert existing thumbnails and detail images to WebP format using the new thumbnail generation logic.
This script should be run after deploying the new thumbnail service to update existing images.
"""

import os
import sys
import asyncio
import logging
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Images
from app.services.thumbnail_service import ImageProcessingService
from app import storage
from app.config import settings

# Configure logging
try:
    # Try to write to /tmp which should be writable in Docker
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('/tmp/thumbnail_conversion.log')
        ]
    )
except PermissionError:
    # Fallback to console-only logging if file writing fails
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
logger = logging.getLogger(__name__)

class ThumbnailConverter:
    def __init__(self):
        self.db = SessionLocal()
        self.converted_thumbnails = 0
        self.converted_details = 0
        self.skipped_count = 0
        self.error_count = 0
        
    def __del__(self):
        if self.db:
            self.db.close()
    
    def get_all_images(self) -> List[Images]:
        """Fetch all images from the database"""
        try:
            images = self.db.query(Images).all()
            logger.info(f"Found {len(images)} images in database")
            return images
        except Exception as e:
            logger.error(f"Error fetching images from database: {e}")
            return []
    
    def needs_thumbnail_conversion(self, image: Images) -> bool:
        """Check if an image needs thumbnail conversion to WebP"""
        # Skip if no thumbnail exists
        if not image.thumbnail_key:
            return False
        
        # Skip if thumbnail is already WebP
        if image.thumbnail_key.endswith('.webp'):
            return False
        
        # Convert if thumbnail is JPEG
        if image.thumbnail_key.endswith('.jpg') or image.thumbnail_key.endswith('.jpeg'):
            return True
        
        # Skip other formats for now
        return False
    
    def needs_detail_conversion(self, image: Images) -> bool:
        """Check if an image needs detail image conversion to WebP"""
        # Skip if no detail image exists
        if not image.detail_key:
            return False
        
        # Skip if detail image is already WebP
        if image.detail_key.endswith('.webp'):
            return False
        
        # Convert if detail image is JPEG
        if image.detail_key.endswith('.jpg') or image.detail_key.endswith('.jpeg'):
            return True
        
        # Skip other formats for now
        return False
    
    def fetch_original_image(self, image: Images) -> Optional[bytes]:
        """Fetch the original image content from storage"""
        try:
            if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
                # S3 storage
                response = storage.s3.get_object(
                    Bucket=settings.S3_BUCKET,
                    Key=image.file_key,
                )
                return response["Body"].read()
            else:
                # Local storage
                file_path = os.path.join(settings.STORAGE_DIR, image.file_key)
                if os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        return f.read()
                else:
                    logger.warning(f"Original image file not found: {file_path}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching original image {image.image_id}: {e}")
            return None
    
    def delete_old_file(self, file_key: str, file_type: str) -> bool:
        """Delete the old file from storage"""
        try:
            if not file_key:
                return True
            
            if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
                # S3 storage
                storage.s3.delete_object(
                    Bucket=settings.S3_BUCKET,
                    Key=file_key,
                )
            else:
                # Local storage
                file_path = os.path.join(settings.STORAGE_DIR, file_key)
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            logger.info(f"Deleted old {file_type}: {file_key}")
            return True
        except Exception as e:
            logger.error(f"Error deleting old {file_type} {file_key}: {e}")
            return False
    
    def convert_thumbnail(self, image: Images) -> bool:
        """Convert thumbnail to WebP format"""
        try:
            logger.info(f"Converting thumbnail for image {image.image_id}")
            
            # Fetch original image
            original_content = self.fetch_original_image(image)
            if not original_content:
                logger.error(f"Could not fetch original image for {image.image_id}")
                return False
            
            # Generate new WebP thumbnail
            thumbnail_bytes, thumbnail_filename = ImageProcessingService.create_thumbnail(
                original_content, 
                image.file_key
            )
            
            if not thumbnail_bytes or not thumbnail_filename:
                logger.error(f"Failed to generate WebP thumbnail for {image.image_id}")
                return False
            
            # Upload new thumbnail
            thumbnail_result = ImageProcessingService.upload_image_bytes(
                thumbnail_bytes,
                thumbnail_filename,
                "WEBP"
            )
            
            if not thumbnail_result:
                logger.error(f"Failed to upload WebP thumbnail for {image.image_id}")
                return False
            
            new_thumbnail_key, new_thumbnail_sha256 = thumbnail_result
            
            # Delete old thumbnail
            if not self.delete_old_file(image.thumbnail_key, "thumbnail"):
                logger.warning(f"Could not delete old thumbnail for {image.image_id}")
            
            # Update database record
            image.thumbnail_key = new_thumbnail_key
            image.thumbnail_sha256 = new_thumbnail_sha256
            
            logger.info(f"Successfully converted thumbnail for {image.image_id}: {new_thumbnail_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error converting thumbnail for {image.image_id}: {e}")
            return False
    
    def convert_detail_image(self, image: Images) -> bool:
        """Convert detail image to WebP format"""
        try:
            logger.info(f"Converting detail image for image {image.image_id}")
            
            # Fetch original image
            original_content = self.fetch_original_image(image)
            if not original_content:
                logger.error(f"Could not fetch original image for {image.image_id}")
                return False
            
            # Generate new WebP detail image
            detail_bytes, detail_filename = ImageProcessingService.create_detail_image(
                original_content, 
                image.file_key
            )
            
            if not detail_bytes or not detail_filename:
                logger.error(f"Failed to generate WebP detail image for {image.image_id}")
                return False
            
            # Upload new detail image
            detail_result = ImageProcessingService.upload_image_bytes(
                detail_bytes,
                detail_filename,
                "WEBP"
            )
            
            if not detail_result:
                logger.error(f"Failed to upload WebP detail image for {image.image_id}")
                return False
            
            new_detail_key, new_detail_sha256 = detail_result
            
            # Delete old detail image
            if not self.delete_old_file(image.detail_key, "detail image"):
                logger.warning(f"Could not delete old detail image for {image.image_id}")
            
            # Update database record
            image.detail_key = new_detail_key
            image.detail_sha256 = new_detail_sha256
            
            logger.info(f"Successfully converted detail image for {image.image_id}: {new_detail_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error converting detail image for {image.image_id}: {e}")
            return False
    
    def process_images(self) -> Tuple[int, int, int, int]:
        """Process all images and convert thumbnails and detail images to WebP"""
        images = self.get_all_images()
        
        if not images:
            logger.warning("No images found in database")
            return 0, 0, 0, 0
        
        logger.info(f"Starting image conversion for {len(images)} images...")
        
        for i, image in enumerate(images, 1):
            try:
                if i % 10 == 0:
                    logger.info(f"Progress: {i}/{len(images)} images processed")
                
                needs_conversion = False
                
                # Check and convert thumbnail
                if self.needs_thumbnail_conversion(image):
                    if self.convert_thumbnail(image):
                        self.converted_thumbnails += 1
                        needs_conversion = True
                    else:
                        self.error_count += 1
                
                # Check and convert detail image
                if self.needs_detail_conversion(image):
                    if self.convert_detail_image(image):
                        self.converted_details += 1
                        needs_conversion = True
                    else:
                        self.error_count += 1
                
                # Commit changes if any conversions were made
                if needs_conversion:
                    self.db.commit()
                else:
                    self.skipped_count += 1
                    
            except Exception as e:
                logger.error(f"Error processing image {image.image_id}: {e}")
                self.db.rollback()
                self.error_count += 1
        
        return self.converted_thumbnails, self.converted_details, self.skipped_count, self.error_count

def main():
    """Main function to run the thumbnail conversion"""
    logger.info("Starting image conversion script...")
    
    try:
        converter = ThumbnailConverter()
        converted_thumbnails, converted_details, skipped, errors = converter.process_images()
        
        logger.info("=" * 50)
        logger.info("IMAGE CONVERSION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Thumbnails converted to WebP: {converted_thumbnails}")
        logger.info(f"Detail images converted to WebP: {converted_details}")
        logger.info(f"Images skipped (already WebP or no images): {skipped}")
        logger.info(f"Images with errors: {errors}")
        logger.info(f"Total conversions: {converted_thumbnails + converted_details}")
        logger.info("=" * 50)
        
        if errors > 0:
            logger.warning(f"Some images had errors during conversion. Check the log file for details.")
            return 1
        else:
            logger.info("All image conversions completed successfully!")
            return 0
            
    except Exception as e:
        logger.error(f"Fatal error during image conversion: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
