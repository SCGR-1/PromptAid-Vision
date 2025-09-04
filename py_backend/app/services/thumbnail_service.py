import io
from PIL import Image, ImageOps
from typing import Tuple, Optional
import base64
from ..storage import upload_fileobj, get_object_url

class ImageProcessingService:
    """Service for creating and managing multiple image resolutions"""
    
    @staticmethod
    def create_resized_image(
        image_content: bytes,
        filename: str,
        max_width: int,
        max_height: int,
        quality: int = 85,
        suffix: str = "",
        format: str = "JPEG"
    ) -> Tuple[bytes, str]:
        """
        Create a resized image from original content
        
        Args:
            image_content: Raw image bytes
            filename: Original filename (for extension detection)
            max_width: Maximum width for resized image
            max_height: Maximum height for resized image
            quality: Quality (1-100)
            suffix: Suffix to add to filename (e.g., "_thumb", "_detail")
            format: Output format ("JPEG" or "WEBP")
            
        Returns:
            Tuple of (resized_bytes, resized_filename)
        """
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_content))
            
            # Honor EXIF orientation
            image = ImageOps.exif_transpose(image)
            
            # Convert to RGB if necessary (for JPEG/WebP output)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Calculate new dimensions maintaining aspect ratio
            width, height = image.size
            ratio = min(max_width / width, max_height / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            
            # Resize image
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to bytes with optimized compression
            output = io.BytesIO()
            if format == "WEBP":
                image.save(output, format='WEBP', quality=quality, method=6, optimize=True)
            else:
                image.save(output, format='JPEG', quality=quality, progressive=True, optimize=True, subsampling=0)
            resized_bytes = output.getvalue()
            
            # Generate resized filename with correct extension
            name_parts = filename.rsplit('.', 1)
            base_name = name_parts[0] if len(name_parts) > 1 else filename
            extension = "webp" if format == "WEBP" else "jpg"
            resized_filename = f"{base_name}{suffix}.{extension}"
            
            return resized_bytes, resized_filename
            
        except Exception as e:
            print(f"Error creating resized image: {str(e)}")
            # Return original content as fallback
            return image_content, filename
    
    @staticmethod
    def create_resized_image_max_width(
        image_content: bytes,
        filename: str,
        max_width: int,
        quality: int = 85,
        suffix: str = "",
        format: str = "JPEG"
    ) -> Tuple[bytes, str]:
        """
        Create a resized image using max width only while keeping aspect ratio
        
        Args:
            image_content: Raw image bytes
            filename: Original filename (for extension detection)
            max_width: Maximum width for resized image
            quality: Quality (1-100)
            suffix: Suffix to add to filename (e.g., "_thumb", "_detail")
            format: Output format ("JPEG" or "WEBP")
            
        Returns:
            Tuple of (resized_bytes, resized_filename)
        """
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_content))
            
            # Honor EXIF orientation
            image = ImageOps.exif_transpose(image)
            
            # Convert to RGB if necessary (for JPEG/WebP output)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Calculate new dimensions using max width only
            width, height = image.size
            if width <= max_width:
                # Image is already smaller than max_width, no need to resize
                new_width, new_height = width, height
            else:
                # Resize to max_width while keeping aspect ratio
                ratio = max_width / width
                new_width = int(width * ratio)
                new_height = int(height * ratio)
            
            # Resize image if needed
            if new_width != width or new_height != height:
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to bytes with optimized compression
            output = io.BytesIO()
            if format == "WEBP":
                image.save(output, format='WEBP', quality=quality, method=6, optimize=True)
            else:
                image.save(output, format='JPEG', quality=quality, progressive=True, optimize=True, subsampling=0)
            resized_bytes = output.getvalue()
            
            # Generate resized filename with correct extension
            name_parts = filename.rsplit('.', 1)
            base_name = name_parts[0] if len(name_parts) > 1 else filename
            extension = "webp" if format == "WEBP" else "jpg"
            resized_filename = f"{base_name}{suffix}.{extension}"
            
            return resized_bytes, resized_filename
            
        except Exception as e:
            print(f"Error creating resized image: {str(e)}")
            # Return original content as fallback
            return image_content, filename
    
    @staticmethod
    def create_thumbnail(
        image_content: bytes,
        filename: str
    ) -> Optional[Tuple[bytes, str]]:
        """Create thumbnail (smallest version) - max width 300px, WebP format, 80% quality"""
        return ImageProcessingService.create_resized_image_max_width(
            image_content, filename, 300, 80, "_thumb", "WEBP"
        )
    
    @staticmethod
    def create_detail_image(
        image_content: bytes,
        filename: str
    ) -> Optional[Tuple[bytes, str]]:
        """Create detail version (medium quality) - max width 800px, WebP format, 85% quality"""
        return ImageProcessingService.create_resized_image_max_width(
            image_content, filename, 800, 85, "_detail", "WEBP"
        )
    
    @staticmethod
    def upload_resized_image(
        image_content: bytes,
        filename: str,
        max_width: int,
        max_height: int,
        quality: int = 85,
        suffix: str = "",
        format: str = "JPEG"
    ) -> Optional[Tuple[str, str]]:
        """
        Create and upload a resized image, returning the key and SHA256
        
        Args:
            image_content: Raw image bytes
            filename: Original filename
            max_width: Maximum width for resized image
            max_height: Maximum height for resized image
            quality: Quality (1-100)
            suffix: Suffix to add to filename
            format: Output format ("JPEG" or "WEBP")
            
        Returns:
            Tuple of (resized_key, resized_sha256) or None if failed
        """
        try:
            # Create resized image
            resized_bytes, resized_filename = ImageProcessingService.create_resized_image(
                image_content, filename, max_width, max_height, quality, suffix, format
            )
            
            # Determine content type based on format
            content_type = 'image/webp' if format == 'WEBP' else 'image/jpeg'
            
            # Upload resized image
            resized_key = upload_fileobj(
                io.BytesIO(resized_bytes),
                resized_filename,
                content_type=content_type,
                cache_control='public, max-age=31536000, immutable'
            )
            
            # Calculate SHA256 hash of resized image
            import hashlib
            resized_sha256 = hashlib.sha256(resized_bytes).hexdigest()
            
            # Return key and SHA256
            return resized_key, resized_sha256
            
        except Exception as e:
            print(f"Error uploading resized image: {str(e)}")
            return None
    
    @staticmethod
    def upload_resized_image_max_width(
        image_content: bytes,
        filename: str,
        max_width: int,
        quality: int = 85,
        suffix: str = "",
        format: str = "JPEG"
    ) -> Optional[Tuple[str, str]]:
        """
        Create and upload a resized image using max width only, returning the key and SHA256
        
        Args:
            image_content: Raw image bytes
            filename: Original filename
            max_width: Maximum width for resized image
            quality: Quality (1-100)
            suffix: Suffix to add to filename
            format: Output format ("JPEG" or "WEBP")
            
        Returns:
            Tuple of (resized_key, resized_sha256) or None if failed
        """
        try:
            # Create resized image
            resized_bytes, resized_filename = ImageProcessingService.create_resized_image_max_width(
                image_content, filename, max_width, quality, suffix, format
            )
            
            # Determine content type based on format
            content_type = 'image/webp' if format == 'WEBP' else 'image/jpeg'
            
            # Upload resized image
            resized_key = upload_fileobj(
                io.BytesIO(resized_bytes),
                resized_filename,
                content_type=content_type,
                cache_control='public, max-age=31536000, immutable'
            )
            
            # Calculate SHA256 hash of resized image
            import hashlib
            resized_sha256 = hashlib.sha256(resized_bytes).hexdigest()
            
            # Return key and SHA256
            return resized_key, resized_sha256
            
        except Exception as e:
            print(f"Error uploading resized image: {str(e)}")
            return None
    
    @staticmethod
    def upload_image_bytes(
        image_bytes: bytes,
        filename: str,
        format: str = "WEBP"
    ) -> Optional[Tuple[str, str]]:
        """
        Upload pre-created image bytes without re-processing
        
        Args:
            image_bytes: Pre-created image bytes
            filename: Filename for the image
            format: Image format ("JPEG" or "WEBP")
            
        Returns:
            Tuple of (uploaded_key, sha256) or None if failed
        """
        try:
            # Determine content type based on format
            content_type = 'image/webp' if format == 'WEBP' else 'image/jpeg'
            
            # Upload image bytes
            uploaded_key = upload_fileobj(
                io.BytesIO(image_bytes),
                filename,
                content_type=content_type,
                cache_control='public, max-age=31536000, immutable'
            )
            
            # Calculate SHA256 hash
            import hashlib
            sha256 = hashlib.sha256(image_bytes).hexdigest()
            
            # Return key and SHA256
            return uploaded_key, sha256
            
        except Exception as e:
            print(f"Error uploading image bytes: {str(e)}")
            return None
    
    @staticmethod
    def process_all_resolutions(
        image_content: bytes,
        filename: str
    ) -> Tuple[Optional[Tuple[str, str]], Optional[Tuple[str, str]]]:
        """
        Create and upload both thumbnail and detail versions
        
        Args:
            image_content: Raw image bytes
            filename: Original filename
            
        Returns:
            Tuple of (thumbnail_result, detail_result) where each result is (key, sha256) or None
        """
        thumbnail_result = None
        detail_result = None
        
        try:
            # Create thumbnail (WebP format, max width 300px, 80% quality)
            thumbnail_bytes, thumbnail_filename = ImageProcessingService.create_thumbnail(image_content, filename)
            if thumbnail_bytes and thumbnail_filename:
                # Upload the pre-created thumbnail bytes without re-processing
                thumbnail_result = ImageProcessingService.upload_image_bytes(
                    thumbnail_bytes, thumbnail_filename, "WEBP"
                )
            
            # Create detail version (WebP format, max width 800px, 85% quality)
            detail_bytes, detail_filename = ImageProcessingService.create_detail_image(image_content, filename)
            if detail_bytes and detail_filename:
                # Upload the pre-created detail bytes without re-processing
                detail_result = ImageProcessingService.upload_image_bytes(
                    detail_bytes, detail_filename, "WEBP"
                )
                
        except Exception as e:
            print(f"Error processing image resolutions: {str(e)}")
        
        return thumbnail_result, detail_result
    
    @staticmethod
    def get_thumbnail_url(image_url: str, fallback_url: Optional[str] = None) -> str:
        """
        Get thumbnail URL from image URL or return fallback
        
        Args:
            image_url: Original image URL
            fallback_url: Fallback URL if thumbnail not available
            
        Returns:
            Thumbnail URL or fallback
        """
        # For now, return the original URL as fallback
        # In a real implementation, you might have a mapping or pattern
        return fallback_url or image_url
