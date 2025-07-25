# app/storage.py

import io
import boto3
import botocore
from uuid import uuid4
from typing import BinaryIO
from .config import settings

# Initialize the S3/MinIO client
s3 = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
)

def upload_fileobj(fileobj: BinaryIO, filename: str) -> str:
    """
    Uploads a file-like object to the configured S3 bucket,
    automatically creating the bucket if it doesn't exist.
    Returns the object key.
    """
    key = f"maps/{uuid4()}_{filename}"

    # 1) Ensure the bucket exists
    try:
        s3.head_bucket(Bucket=settings.S3_BUCKET)
    except botocore.exceptions.ClientError as e:
        # A 404 or 403 here means the bucket doesn't exist or no access:
        s3.create_bucket(Bucket=settings.S3_BUCKET)

    # 2) Perform the upload
    fileobj.seek(0)  # rewind in case .read() was called
    s3.upload_fileobj(fileobj, settings.S3_BUCKET, key)

    return key

def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Returns a presigned URL for GETting the object.
    """
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )
