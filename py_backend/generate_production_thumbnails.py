#!/usr/bin/env python3

import io
import os
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Images
from app.services.thumbnail_service import ImageProcessingService
from app.storage import s3
from app.config import settings

def get_object_content(key: str) -> bytes:
    """Download object content from storage"""
    try:
        if settings.STORAGE_PROVIDER == "local":
            # Local storage
            file_path = os.path.join(settings.STORAGE_DIR, key)
            if not os.path.exists(file_path):
                return None
            with open(file_path, 'rb') as f:
                return f.read()
        else:
            # S3 storage
            response = s3.get_object(Bucket=settings.S3_BUCKET, Key=key)
            return response["Body"].read()
    except Exception as e:
        print(f"Error downloading object {key}: {str(e)}")
        return None

def generate_thumbnails_for_production():
    """Generate thumbnails and detail versions for all existing images in production"""
    
    print("Starting thumbnail generation for production images...")
    print(f"Storage provider: {settings.STORAGE_PROVIDER}")
    print(f"S3 bucket: {settings.S3_BUCKET}")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Find all images that don't have thumbnails yet
        images_without_thumbnails = db.query(Images).filter(
            (Images.thumbnail_key.is_(None)) | 
            (Images.detail_key.is_(None))
        ).all()
        
        print(f"Found {len(images_without_thumbnails)} images without thumbnails/detail versions")
        
        if not images_without_thumbnails:
            print("All images already have thumbnails and detail versions!")
            return
        
        success_count = 0
        error_count = 0
        
        for i, image in enumerate(images_without_thumbnails, 1):
            print(f"\nProcessing image {i}/{len(images_without_thumbnails)}: {image.image_id}")
            
            try:
                # Download the original image from storage
                print(f"  Downloading original image: {image.file_key}")
                original_content = get_object_content(image.file_key)
                
                if not original_content:
                    print(f"  ⚠️  Could not download original image: {image.file_key}")
                    error_count += 1
                    continue
                
                # Generate filename from file_key
                filename = image.file_key.split('/')[-1] if '/' in image.file_key else image.file_key
                
                # Process all resolutions
                print(f"  Generating thumbnails and detail versions...")
                thumbnail_result, detail_result = ImageProcessingService.process_all_resolutions(
                    original_content, 
                    filename
                )
                
                # Update database with results
                if thumbnail_result:
                    thumbnail_key, thumbnail_sha256 = thumbnail_result
                    image.thumbnail_key = thumbnail_key
                    image.thumbnail_sha256 = thumbnail_sha256
                    print(f"  ✅ Thumbnail generated: {thumbnail_key}")
                else:
                    print(f"  ❌ Failed to generate thumbnail")
                
                if detail_result:
                    detail_key, detail_sha256 = detail_result
                    image.detail_key = detail_key
                    image.detail_sha256 = detail_sha256
                    print(f"  ✅ Detail version generated: {detail_key}")
                else:
                    print(f"  ❌ Failed to generate detail version")
                
                # Commit changes to database
                db.commit()
                success_count += 1
                print(f"  ✅ Image {image.image_id} processed successfully")
                
            except Exception as e:
                print(f"  ❌ Error processing image {image.image_id}: {str(e)}")
                db.rollback()
                error_count += 1
                continue
        
        print(f"\n=== Summary ===")
        print(f"Total images processed: {len(images_without_thumbnails)}")
        print(f"Successful: {success_count}")
        print(f"Errors: {error_count}")
        print(f"Success rate: {(success_count/len(images_without_thumbnails)*100):.1f}%")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_thumbnails_for_production()
