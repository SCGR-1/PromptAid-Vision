import io
from PIL import Image
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
        suffix: str = ""
    ) -> Tuple[bytes, str]:
        """
        Create a resized image from original content
        
        Args:
            image_content: Raw image bytes
            filename: Original filename (for extension detection)
            max_width: Maximum width for resized image
            max_height: Maximum height for resized image
            quality: JPEG quality (1-100)
            suffix: Suffix to add to filename (e.g., "_thumb", "_detail")
            
        Returns:
            Tuple of (resized_bytes, resized_filename)
        """
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_content))
            
            # Convert to RGB if necessary (for JPEG output)
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
            
            # Save to bytes with compression
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=quality, optimize=True)
            thumbnail_bytes = output.getvalue()
            
            # Generate resized filename
            name_parts = filename.rsplit('.', 1)
            base_name = name_parts[0] if len(name_parts) > 1 else filename
            resized_filename = f"{base_name}{suffix}.jpg"
            
            return thumbnail_bytes, resized_filename
            
        except Exception as e:
            print(f"Error creating thumbnail: {str(e)}")
            # Return original content as fallback
            return image_content, filename
    
    @staticmethod
    def create_thumbnail(
        image_content: bytes,
        filename: str
    ) -> Optional[Tuple[bytes, str]]:
        """Create thumbnail (smallest version) - 300x200px, 85% quality"""
        return ImageProcessingService.create_resized_image(
            image_content, filename, 300, 200, 85, "_thumb"
        )
    
    @staticmethod
    def create_detail_image(
        image_content: bytes,
        filename: str
    ) -> Optional[Tuple[bytes, str]]:
        """Create detail version (medium quality) - 800x600px, 90% quality"""
        return ImageProcessingService.create_resized_image(
            image_content, filename, 800, 600, 90, "_detail"
        )
    
    @staticmethod
    def upload_resized_image(
        image_content: bytes,
        filename: str,
        max_width: int,
        max_height: int,
        quality: int = 85,
        suffix: str = ""
    ) -> Optional[Tuple[str, str]]:
        """
        Create and upload a resized image, returning the key and SHA256
        
        Args:
            image_content: Raw image bytes
            filename: Original filename
            max_width: Maximum width for resized image
            max_height: Maximum height for resized image
            quality: JPEG quality (1-100)
            suffix: Suffix to add to filename
            
        Returns:
            Tuple of (resized_key, resized_sha256) or None if failed
        """
        try:
            # Create resized image
            resized_bytes, resized_filename = ImageProcessingService.create_resized_image(
                image_content, filename, max_width, max_height, quality, suffix
            )
            
            # Upload resized image
            resized_key = upload_fileobj(
                io.BytesIO(resized_bytes),
                resized_filename,
                content_type='image/jpeg',
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
            # Create and upload thumbnail
            thumbnail_bytes, thumbnail_filename = ImageProcessingService.create_thumbnail(image_content, filename)
            if thumbnail_bytes and thumbnail_filename:
                thumbnail_result = ImageProcessingService.upload_resized_image(
                    thumbnail_bytes, thumbnail_filename, 300, 200, 85, "_thumb"
                )
            
            # Create and upload detail version
            detail_bytes, detail_filename = ImageProcessingService.create_detail_image(image_content, filename)
            if detail_bytes and detail_filename:
                detail_result = ImageProcessingService.upload_resized_image(
                    detail_bytes, detail_filename, 800, 600, 90, "_detail"
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
