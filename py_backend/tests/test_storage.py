#!/usr/bin/env python3
"""Test script to debug storage configuration"""

import os
import sys
import io

# Add the parent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.config import settings
from app import storage

def test_environment_variables():
    """Test if environment variables are set correctly"""
    print("=== Environment Variables Test ===")
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    print(f"S3_ENDPOINT: {settings.S3_ENDPOINT}")
    print(f"S3_ACCESS_KEY: {settings.S3_ACCESS_KEY}")
    print(f"S3_SECRET_KEY: {settings.S3_SECRET_KEY}")
    print(f"S3_BUCKET: {settings.S3_BUCKET}")

def test_storage_connection():
    """Test if we can connect to S3/MinIO"""
    print("\n=== Storage Connection Test ===")
    try:
        # Test if we can list buckets
        response = storage.s3.list_buckets()
        print(f"Successfully connected to S3/MinIO")
        print(f"Available buckets: {[b['Name'] for b in response['Buckets']]}")
        
        # Test if our bucket exists
        try:
            storage.s3.head_bucket(Bucket=settings.S3_BUCKET)
            print(f"Bucket '{settings.S3_BUCKET}' exists")
        except Exception as e:
            print(f"Bucket '{settings.S3_BUCKET}' does not exist: {e}")
            # Try to create it
            try:
                storage.s3.create_bucket(Bucket=settings.S3_BUCKET)
                print(f"Created bucket '{settings.S3_BUCKET}'")
            except Exception as e2:
                print(f"Failed to create bucket: {e2}")
                
    except Exception as e:
        print(f"Failed to connect to S3/MinIO: {e}")

def test_upload_function():
    """Test the upload function"""
    print("\n=== Upload Function Test ===")
    try:
        # Create a test file
        test_content = b"This is a test file content"
        test_file = io.BytesIO(test_content)
        
        # Upload it
        key = storage.upload_fileobj(test_file, "test.txt")
        print(f"Successfully uploaded test file with key: {key}")
        
        # Try to generate a presigned URL
        url = storage.generate_presigned_url(key, expires_in=3600)
        print(f"Generated presigned URL: {url}")
        
    except Exception as e:
        print(f"Upload test failed: {e}")

if __name__ == "__main__":
    test_environment_variables()
    test_storage_connection()
    test_upload_function() 