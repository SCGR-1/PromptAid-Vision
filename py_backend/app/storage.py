import io
import mimetypes
from uuid import uuid4
from typing import BinaryIO, Optional

import boto3
import botocore

from .config import settings

s3 = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    region_name=getattr(settings, "S3_REGION", None),
)

# Optional settings you can add to your config:
# - S3_PUBLIC_URL_BASE: str | None  (e.g. "https://cdn.example.com" or bucket website endpoint)
# - S3_PUBLIC_READ: bool            (True if the bucket/objects are world-readable)

def _ensure_bucket() -> None:
    """
    Make sure the bucket exists. Safe to call on every upload.
    """
    try:
        s3.head_bucket(Bucket=settings.S3_BUCKET)
    except botocore.exceptions.ClientError as e:
        # Create bucket. Some providers need LocationConstraint; MinIO typically doesn't.
        create_kwargs = {"Bucket": settings.S3_BUCKET}
        region = getattr(settings, "S3_REGION", None)
        # For AWS S3 outside us-east-1 you must pass LocationConstraint.
        if region and (settings.S3_ENDPOINT is None or "amazonaws.com" in str(settings.S3_ENDPOINT).lower()):
            create_kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
        s3.create_bucket(**create_kwargs)


def get_object_url(key: str, *, expires_in: int = 3600) -> str:
    """
    Return a browser-usable URL for the object.
    If S3_PUBLIC_URL_BASE is set, return a public URL. Otherwise, return a presigned URL.
    """
    public_base = getattr(settings, "S3_PUBLIC_URL_BASE", None)
    if public_base:
        return f"{public_base.rstrip('/')}/{key}"
    return generate_presigned_url(key, expires_in=expires_in)


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Returns a presigned URL for GETting the object.
    """
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )


def upload_fileobj(
    fileobj: BinaryIO,
    filename: str,
    *,
    content_type: Optional[str] = None,
    cache_control: Optional[str] = "public, max-age=31536000, immutable",
) -> str:
    """
    Upload a file-like object to the configured S3 bucket.
    Returns the object key (not the URL).
    """
    _ensure_bucket()

    # Build a namespaced key; keep original filename tail if helpful
    safe_name = filename or "upload.bin"
    key = f"maps/{uuid4()}_{safe_name}"

    # Guess content type if not provided
    ct = content_type or (mimetypes.guess_type(safe_name)[0] or "application/octet-stream")

    # Make sure we read from the start
    try:
        fileobj.seek(0)
    except Exception:
        pass

    extra_args = {"ContentType": ct}
    if cache_control:
        extra_args["CacheControl"] = cache_control
    if getattr(settings, "S3_PUBLIC_READ", False):
        # Only set this if your bucket policy allows public read
        extra_args["ACL"] = "public-read"

    s3.upload_fileobj(fileobj, settings.S3_BUCKET, key, ExtraArgs=extra_args)
    return key


def upload_bytes(
    data: bytes,
    filename: str,
    *,
    content_type: Optional[str] = None,
    cache_control: Optional[str] = "public, max-age=31536000, immutable",
) -> str:
    """
    Convenience helper to upload raw bytes (e.g., after server-side URL download).
    """
    buf = io.BytesIO(data)
    return upload_fileobj(buf, filename, content_type=content_type, cache_control=cache_control)


def copy_object(
    src_key: str,
    *,
    new_filename: Optional[str] = None,
    cache_control: Optional[str] = "public, max-age=31536000, immutable",
) -> str:
    """
    Server-side copy within the same bucket (no download/upload round-trip).
    Useful for 'duplicate' endpoints if you already know the source key.
    Returns the NEW object key.
    """
    _ensure_bucket()
    tail = new_filename or src_key.split("/")[-1]
    dest_key = f"maps/{uuid4()}_{tail}"

    extra_args = {}
    if cache_control:
        extra_args["CacheControl"] = cache_control
    if getattr(settings, "S3_PUBLIC_READ", False):
        extra_args["ACL"] = "public-read"

    s3.copy(
        {"Bucket": settings.S3_BUCKET, "Key": src_key},
        settings.S3_BUCKET,
        dest_key,
        ExtraArgs=extra_args or None,
    )
    return dest_key


def delete_object(key: str) -> None:
    """
    Delete an object (best-effort).
    """
    try:
        s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
    except botocore.exceptions.ClientError:
        # Swallow to keep deletes idempotent for callers
        pass
