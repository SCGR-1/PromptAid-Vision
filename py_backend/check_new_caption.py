#!/usr/bin/env python3
"""Check if the new caption ID exists"""

from app.database import SessionLocal
from app import models

def check_new_caption():
    caption_id = "a57497fe-1583-4cec-8b34-a94bb229e3ea"
    print(f"Checking if caption {caption_id} exists...")
    
    db = SessionLocal()
    try:
        caption = db.query(models.Captions).filter(models.Captions.cap_id == caption_id).first()
        if caption:
            print(f"✓ Caption found!")
            print(f"  Image ID: {caption.image_id}")
            print(f"  Title: {caption.title}")
            print(f"  Generated: {caption.generated[:50]}...")
        else:
            print(f"✗ Caption NOT found!")
            
            # Check if the image exists
            all_captions = db.query(models.Captions).all()
            print(f"Total captions: {len(all_captions)}")
            if all_captions:
                print("Recent captions:")
                for i, c in enumerate(all_captions[-3:]):  # Show last 3
                    print(f"  {i+1}. {c.cap_id} -> Image: {c.image_id}")
    finally:
        db.close()

if __name__ == "__main__":
    check_new_caption() 