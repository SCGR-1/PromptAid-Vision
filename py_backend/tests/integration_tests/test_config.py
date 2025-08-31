#!/usr/bin/env python3
"""Test script to verify storage configuration"""

import os
import sys
sys.path.append('..')

from app.config import settings
from app.storage import get_object_url

def test_config():
    print("=== Storage Configuration Test ===")
    print(f"STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")
    print(f"S3_ENDPOINT: {settings.S3_ENDPOINT}")
    print(f"S3_BUCKET: {settings.S3_BUCKET}")
    print(f"S3_PUBLIC_URL_BASE: {settings.S3_PUBLIC_URL_BASE}")
    
    if settings.STORAGE_PROVIDER == "s3":
        print("\n=== S3 Storage Test ===")
        try:
            # Test URL generation
            test_key = "maps/test_image.jpg"
            url = get_object_url(test_key)
            print(f"Generated URL for '{test_key}': {url}")
            
            if settings.S3_PUBLIC_URL_BASE:
                print(f"✅ Using public URL base: {settings.S3_PUBLIC_URL_BASE}")
            else:
                print("⚠️  No S3_PUBLIC_URL_BASE set - will use presigned URLs")
                
        except Exception as e:
            print(f"❌ Error testing S3 storage: {e}")
    else:
        print(f"\n=== Local Storage Test ===")
        print(f"Storage directory: {settings.STORAGE_DIR}")
        print("✅ Local storage configured")

if __name__ == "__main__":
    test_config()
