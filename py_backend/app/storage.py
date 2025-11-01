import io
import os
import mimetypes
from uuid import uuid4
from typing import BinaryIO, Optional

from .config import settings

if settings.STORAGE_PROVIDER != "local":
    import boto3
    import botocore
    
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=getattr(settings, "S3_REGION", None),
    )
else:
    class DummyS3Client:
        def __init__(self):
            pass
        
        def get_object(self, **kwargs):
            raise RuntimeError("S3 client not available in local storage mode")
        
        def generate_presigned_url(self, **kwargs):
            raise RuntimeError("S3 client not available in local storage mode")
    
    s3 = DummyS3Client()


def _ensure_bucket() -> None:
    """Ensure bucket exists. Safe to call on every upload."""
    if settings.STORAGE_PROVIDER == "local":
        os.makedirs(settings.STORAGE_DIR, exist_ok=True)
        return
        
    try:
        s3.head_bucket(Bucket=settings.S3_BUCKET)
    except botocore.exceptions.ClientError as e:
        create_kwargs = {"Bucket": settings.S3_BUCKET}
        region = getattr(settings, "S3_REGION", None)
        if region and (settings.S3_ENDPOINT is None or "amazonaws.com" in str(settings.S3_ENDPOINT).lower()):
            create_kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
        s3.create_bucket(**create_kwargs)


_url_cache: dict[str, str] = {}

def get_object_url(key: str, *, expires_in: int = 3600, cache: Optional[dict[str, str]] = None) -> str:
    """Return browser-usable URL for object.
    
    If cache dict is provided, URLs are cached per key to avoid duplicate presigned URL generation.
    """
    if settings.STORAGE_PROVIDER == "local":
        return f"/uploads/{key}"
    
    public_base = getattr(settings, "S3_PUBLIC_URL_BASE", None)
    if public_base:
        return f"{public_base.rstrip('/')}/{key}"
    
    cache_dict = cache if cache is not None else _url_cache
    
    if key in cache_dict:
        return cache_dict[key]
    
    url = generate_presigned_url(key, expires_in=expires_in)
    cache_dict[key] = url
    return url

def clear_url_cache():
    """Clear the global URL cache (mainly for testing)."""
    _url_cache.clear()


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate presigned URL for GETting object."""
    if settings.STORAGE_PROVIDER == "local":
        return f"/uploads/{key}"
    
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
    """Upload file-like object to configured storage. Returns object key."""
    if settings.STORAGE_PROVIDER == "local":
        return _upload_local(fileobj, filename, content_type)
    else:
        return _upload_s3(fileobj, filename, content_type, cache_control)

def _upload_local(
    fileobj: BinaryIO,
    filename: str,
    content_type: Optional[str] = None,
) -> str:
    """Upload to local filesystem"""
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    
    safe_name = filename or "upload.bin"
    key = f"maps/{uuid4()}_{safe_name}"
    filepath = os.path.join(settings.STORAGE_DIR, key)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'wb') as f:
        fileobj.seek(0)
        f.write(fileobj.read())
    
    return key

def _upload_s3(
    fileobj: BinaryIO,
    filename: str,
    content_type: Optional[str] = None,
    cache_control: Optional[str] = "public, max-age=31536000, immutable",
) -> str:
    """Upload to S3/MinIO"""
    _ensure_bucket()

    safe_name = filename or "upload.bin"
    key = f"maps/{uuid4()}_{safe_name}"

    ct = content_type or (mimetypes.guess_type(safe_name)[0] or "application/octet-stream")

    try:
        fileobj.seek(0)
    except Exception:
        pass

    extra_args = {"ContentType": ct}
    if cache_control:
        extra_args["CacheControl"] = cache_control
    if getattr(settings, "S3_PUBLIC_READ", False):
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
    """Upload raw bytes. Returns object key."""
    buf = io.BytesIO(data)
    return upload_fileobj(buf, filename, content_type=content_type, cache_control=cache_control)


def copy_object(
    src_key: str,
    *,
    new_filename: Optional[str] = None,
    cache_control: Optional[str] = "public, max-age=31536000, immutable",
) -> str:
    """Server-side copy within same bucket. Returns new object key."""
    if settings.STORAGE_PROVIDER == "local":
        return _copy_local(src_key, new_filename)
    else:
        return _copy_s3(src_key, new_filename, cache_control)

def _copy_local(src_key: str, new_filename: Optional[str] = None) -> str:
    """Copy file locally"""
    src_path = os.path.join(settings.STORAGE_DIR, src_key)
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source file not found: {src_key}")
    
    tail = new_filename or src_key.split("/")[-1]
    dest_key = f"maps/{uuid4()}_{tail}"
    dest_path = os.path.join(settings.STORAGE_DIR, dest_key)
    
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    with open(src_path, 'rb') as src, open(dest_path, 'wb') as dest:
        dest.write(src.read())
    
    return dest_key

def _copy_s3(src_key: str, new_filename: Optional[str] = None, cache_control: Optional[str] = None) -> str:
    """Copy file in S3"""
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
    """Delete object (best-effort)."""
    if settings.STORAGE_PROVIDER == "local":
        _delete_local(key)
    else:
        _delete_s3(key)

def _delete_local(key: str) -> None:
    """Delete file locally"""
    try:
        file_path = os.path.join(settings.STORAGE_DIR, key)
        if os.path.exists(file_path):
            os.remove(file_path)
    except (OSError, FileNotFoundError):
        pass

def _delete_s3(key: str) -> None:
    """Delete file in S3"""
    try:
        s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
    except botocore.exceptions.ClientError:
        pass
