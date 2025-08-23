import io
import mimetypes
from typing import Tuple, Optional, BinaryIO
from PIL import Image, ImageOps

# Import PyMuPDF for PDF processing
try:
    import fitz  # PyMuPDF for PDF processing
    FITZ_AVAILABLE = True
except ImportError:
    try:
        import PyMuPDF as fitz  # Alternative import
        FITZ_AVAILABLE = True
    except ImportError:
        fitz = None  # PDF processing will be disabled
        FITZ_AVAILABLE = False

import tempfile
import os

class ImagePreprocessor:
    """Service for preprocessing various image formats before storage"""
    
    # Configuration options for performance tuning
    PDF_ZOOM_FACTOR = 1.5  # Reduce from 2.0 for better performance
    PDF_COMPRESS_LEVEL = 6  # PNG compression level (0-9, higher = smaller but slower)
    PDF_QUALITY_MODE = 'balanced'  # 'fast', 'balanced', or 'quality'
    
    # PyMuPDF availability flag
    FITZ_AVAILABLE = FITZ_AVAILABLE
    
    SUPPORTED_IMAGE_MIME_TYPES = {
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/heic',
        'image/heif',
        'image/webp',
        'image/gif',
        'image/tiff',
        'image/tif',
        'application/pdf'
    }
    
    @staticmethod
    def detect_mime_type(file_content: bytes, filename: str) -> str:
        """Detect MIME type from file content and filename"""
        # First try to detect from content
        mime_type, _ = mimetypes.guess_type(filename)
        
        # If no MIME type detected, try to infer from content
        if not mime_type:
            # Check for common file signatures
            if file_content.startswith(b'\x89PNG\r\n\x1a\n'):
                mime_type = 'image/png'
            elif file_content.startswith(b'\xff\xd8\xff'):
                mime_type = 'image/jpeg'
            elif file_content.startswith(b'\x49\x49\x2a\x00') or file_content.startswith(b'\x4d\x4d\x00\x2a'):
                mime_type = 'image/tiff'
            elif file_content.startswith(b'%PDF'):
                mime_type = 'application/pdf'
            elif file_content.startswith(b'GIF87a') or file_content.startswith(b'GIF89a'):
                mime_type = 'image/gif'
            elif file_content.startswith(b'RIFF') and file_content[8:12] == b'WEBP':
                mime_type = 'image/webp'
            elif file_content.startswith(b'\x00\x00\x00\x20ftypheic') or file_content.startswith(b'\x00\x00\x00\x20ftypheix'):
                mime_type = 'image/heic'
            else:
                mime_type = 'application/octet-stream'
        
        return mime_type
    
    @staticmethod
    def needs_preprocessing(mime_type: str) -> bool:
        """Check if the file needs preprocessing"""
        return mime_type not in {'image/png', 'image/jpeg', 'image/jpg'}
    
    @staticmethod
    def preprocess_image(
        file_content: bytes, 
        filename: str, 
        target_format: str = 'PNG',
        quality: int = 95
    ) -> Tuple[bytes, str, str]:
        """
        Preprocess image and return processed content, new filename, and MIME type
        
        Args:
            file_content: Raw file content
            filename: Original filename
            target_format: Target format ('PNG' or 'JPEG')
            quality: JPEG quality (1-100, only used for JPEG)
            
        Returns:
            Tuple of (processed_content, new_filename, mime_type)
        """
        mime_type = ImagePreprocessor.detect_mime_type(file_content, filename)
        
        if not ImagePreprocessor.needs_preprocessing(mime_type):
            # No preprocessing needed
            return file_content, filename, mime_type
        
        try:
            if mime_type == 'application/pdf':
                return ImagePreprocessor._process_pdf(file_content, filename, target_format, quality)
            elif mime_type in {'image/tiff', 'image/tif'}:
                return ImagePreprocessor._process_tiff(file_content, filename, target_format, quality)
            elif mime_type in {'image/heic', 'image/heif'}:
                return ImagePreprocessor._process_heic(file_content, filename, target_format, quality)
            elif mime_type == 'image/webp':
                return ImagePreprocessor._process_webp(file_content, filename, target_format, quality)
            elif mime_type == 'image/gif':
                return ImagePreprocessor._process_gif(file_content, filename, target_format, quality)
            else:
                # Unsupported format, try to open with PIL as fallback
                return ImagePreprocessor._process_generic(file_content, filename, target_format, quality)
                
        except Exception as e:
            raise ValueError(f"Failed to preprocess {mime_type} file: {str(e)}")
    
    @staticmethod
    def configure_pdf_processing(zoom_factor: float = 1.5, compress_level: int = 6, quality_mode: str = 'balanced'):
        """
        Configure PDF processing performance settings
        
        Args:
            zoom_factor: PDF zoom factor (1.0 = original size, 2.0 = 2x size)
                       Lower values = faster processing, lower quality
                       Higher values = slower processing, higher quality
            compress_level: PNG compression level (0-9)
                          Lower values = faster compression, larger files
                          Higher values = slower compression, smaller files
            quality_mode: Processing mode ('fast', 'balanced', 'quality')
        """
        if quality_mode == 'fast':
            ImagePreprocessor.PDF_ZOOM_FACTOR = 1.0
            ImagePreprocessor.PDF_COMPRESS_LEVEL = 3
        elif quality_mode == 'quality':
            ImagePreprocessor.PDF_ZOOM_FACTOR = 2.0
            ImagePreprocessor.PDF_COMPRESS_LEVEL = 9
        else:  # balanced
            ImagePreprocessor.PDF_ZOOM_FACTOR = zoom_factor
            ImagePreprocessor.PDF_COMPRESS_LEVEL = compress_level
        
        print(f"PDF processing configured: zoom={ImagePreprocessor.PDF_ZOOM_FACTOR}, "
              f"compression={ImagePreprocessor.PDF_COMPRESS_LEVEL}, mode={quality_mode}")
    
    @staticmethod
    def _process_pdf(
        file_content: bytes, 
        filename: str, 
        target_format: str, 
        quality: int
    ) -> Tuple[bytes, str, str]:
        """Process PDF files by rasterizing the first page"""
        if not ImagePreprocessor.FITZ_AVAILABLE:
            raise ValueError("PDF processing is not available. PyMuPDF is not installed.")
            
        try:
            print(f"Starting PDF processing for {filename}...")
            
            # Open PDF with PyMuPDF
            pdf_document = fitz.open(stream=file_content, filetype="pdf")
            
            if len(pdf_document) == 0:
                raise ValueError("PDF has no pages")
            
            print(f"PDF opened successfully, processing page 1 of {len(pdf_document)}...")
            
            # Get first page
            page = pdf_document[0]
            
            # Use configurable zoom factor for performance tuning
            zoom = ImagePreprocessor.PDF_ZOOM_FACTOR
            mat = fitz.Matrix(zoom, zoom)
            
            print(f"Rendering page at {zoom}x zoom...")
            
            # Render page to image with optimized settings
            pix = page.get_pixmap(
                matrix=mat, 
                alpha=False,  # No alpha channel needed
                colorspace="rgb"  # Force RGB colorspace
            )
            
            print(f"Page rendered, size: {pix.width}x{pix.height}")
            
            # Convert to PIL Image - use more efficient method
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            print(f"Image converted to RGB, mode: {img.mode}")
            
            # Save to bytes with optimization
            output_buffer = io.BytesIO()
            if target_format == 'PNG':
                img.save(output_buffer, format='PNG', optimize=True, compress_level=ImagePreprocessor.PDF_COMPRESS_LEVEL)
                new_mime_type = 'image/png'
                new_extension = '.png'
            else:
                img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
                new_mime_type = 'image/jpeg'
                new_extension = '.jpg'
            
            # Clean up resources immediately
            pdf_document.close()
            del pix  # Free memory
            
            # Generate new filename
            base_name = os.path.splitext(filename)[0]
            new_filename = f"{base_name}{new_extension}"
            
            print(f"PDF processing completed: {filename} -> {new_filename}")
            
            return output_buffer.getvalue(), new_filename, new_mime_type
            
        except Exception as e:
            print(f"PDF processing failed: {str(e)}")
            raise ValueError(f"Failed to process PDF: {str(e)}")
    
    @staticmethod
    def _process_tiff(
        file_content: bytes, 
        filename: str, 
        target_format: str, 
        quality: int
    ) -> Tuple[bytes, str, str]:
        """Process TIFF/GeoTIFF files by rendering RGB view"""
        try:
            img = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P', 'CMYK', 'LAB', 'HSV', 'I', 'F'):
                img = img.convert('RGB')
            
            # Save to bytes
            output_buffer = io.BytesIO()
            if target_format == 'PNG':
                img.save(output_buffer, format='PNG', optimize=True)
                new_mime_type = 'image/png'
                new_extension = '.png'
            else:
                img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
                new_mime_type = 'image/jpeg'
                new_extension = '.jpg'
            
            # Generate new filename
            base_name = os.path.splitext(filename)[0]
            new_filename = f"{base_name}{new_extension}"
            
            return output_buffer.getvalue(), new_filename, new_mime_type
            
        except Exception as e:
            raise ValueError(f"Failed to process TIFF: {str(e)}")
    
    @staticmethod
    def _process_heic(
        file_content: bytes, 
        filename: str, 
        target_format: str, 
        quality: int
    ) -> Tuple[bytes, str, str]:
        """Process HEIC/HEIF files"""
        try:
            img = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Save to bytes
            output_buffer = io.BytesIO()
            if target_format == 'PNG':
                img.save(output_buffer, format='PNG', optimize=True)
                new_mime_type = 'image/png'
                new_extension = '.png'
            else:
                img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
                new_mime_type = 'image/jpeg'
                new_extension = '.jpg'
            
            # Generate new filename
            base_name = os.path.splitext(filename)[0]
            new_filename = f"{base_name}{new_extension}"
            
            return output_buffer.getvalue(), new_filename, new_mime_type
            
        except Exception as e:
            raise ValueError(f"Failed to process HEIC: {str(e)}")
    
    @staticmethod
    def _process_webp(
        file_content: bytes, 
        filename: str, 
        target_format: str, 
        quality: int
    ) -> Tuple[bytes, str, str]:
        """Process WebP files"""
        try:
            img = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Save to bytes
            output_buffer = io.BytesIO()
            if target_format == 'PNG':
                img.save(output_buffer, format='PNG', optimize=True)
                new_mime_type = 'image/png'
                new_extension = '.png'
            else:
                img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
                new_mime_type = 'image/jpeg'
                new_extension = '.jpg'
            
            # Generate new filename
            base_name = os.path.splitext(filename)[0]
            new_filename = f"{base_name}{new_extension}"
            
            return output_buffer.getvalue(), new_filename, new_mime_type
            
        except Exception as e:
            raise ValueError(f"Failed to process WebP: {str(e)}")
    
    @staticmethod
    def _process_gif(
        file_content: bytes, 
        filename: str, 
        target_format: str, 
        quality: int
    ) -> Tuple[bytes, str, str]:
        """Process GIF files (static only)"""
        try:
            img = Image.open(io.BytesIO(file_content))
            
            # Check if GIF is animated
            if hasattr(img, 'n_frames') and img.n_frames > 1:
                # Take first frame for animated GIFs
                img.seek(0)
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Save to bytes
            output_buffer = io.BytesIO()
            if target_format == 'PNG':
                img.save(output_buffer, format='PNG', optimize=True)
                new_mime_type = 'image/png'
                new_extension = '.png'
            else:
                img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
                new_mime_type = 'image/jpeg'
                new_extension = '.jpg'
            
            # Generate new filename
            base_name = os.path.splitext(filename)[0]
            new_filename = f"{base_name}{new_extension}"
            
            return output_buffer.getvalue(), new_filename, new_mime_type
            
        except Exception as e:
            raise ValueError(f"Failed to process GIF: {str(e)}")
    
    @staticmethod
    def _process_generic(
        file_content: bytes, 
        filename: str, 
        target_format: str, 
        quality: int
    ) -> Tuple[bytes, str, str]:
        """Generic processing for other formats"""
        try:
            img = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P', 'CMYK', 'LAB', 'HSV', 'I', 'F'):
                img = img.convert('RGB')
            
            # Save to bytes
            output_buffer = io.BytesIO()
            if target_format == 'PNG':
                img.save(output_buffer, format='PNG', optimize=True)
                new_mime_type = 'image/png'
                new_extension = '.png'
            else:
                img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
                new_mime_type = 'image/jpeg'
                new_extension = '.jpg'
            
            # Generate new filename
            base_name = os.path.splitext(filename)[0]
            new_filename = f"{base_name}{new_extension}"
            
            return output_buffer.getvalue(), new_filename, new_mime_type
            
        except Exception as e:
            raise ValueError(f"Failed to process generic format: {str(e)}")
