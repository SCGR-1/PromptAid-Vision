#!/usr/bin/env python3

import sys
import os
sys.path.append('.')

from app.database import SessionLocal
from app import crud, models

def fix_image_counts():
    """Update image_count for all existing captions based on their linked images"""
    db = SessionLocal()
    
    try:
        print("Starting image_count fix for existing multi-uploads...")
        
        # Get all captions with their linked images
        captions = crud.get_all_captions_with_images(db)
        print(f"Found {len(captions)} captions to process")
        
        updated_count = 0
        skipped_count = 0
        
        for caption in captions:
            # Skip if image_count is already set correctly
            if caption.image_count is not None and caption.image_count > 0:
                if caption.image_count == len(caption.images):
                    skipped_count += 1
                    continue
            
            # Calculate the correct image count
            correct_image_count = len(caption.images)
            
            if correct_image_count == 0:
                print(f"Warning: Caption {caption.caption_id} has no linked images")
                continue
            
            # Update the image_count
            old_count = caption.image_count
            caption.image_count = correct_image_count
            
            print(f"Updated caption {caption.caption_id}: {old_count} -> {correct_image_count} (title: '{caption.title}')")
            updated_count += 1
        
        # Commit all changes
        db.commit()
        print(f"\nDatabase update complete!")
        print(f"Updated: {updated_count} captions")
        print(f"Skipped: {skipped_count} captions (already correct)")
        
        # Verify the changes
        print("\nVerifying changes...")
        captions_after = crud.get_all_captions_with_images(db)
        
        multi_uploads = [c for c in captions_after if c.image_count and c.image_count > 1]
        single_uploads = [c for c in captions_after if c.image_count == 1]
        null_counts = [c for c in captions_after if c.image_count is None or c.image_count == 0]
        
        print(f"Multi-uploads (image_count > 1): {len(multi_uploads)}")
        print(f"Single uploads (image_count = 1): {len(single_uploads)}")
        print(f"Captions with null/zero image_count: {len(null_counts)}")
        
        if null_counts:
            print("\nCaptions still with null/zero image_count:")
            for c in null_counts[:5]:  # Show first 5
                print(f"  - {c.caption_id}: {len(c.images)} linked images, image_count={c.image_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_image_counts()
