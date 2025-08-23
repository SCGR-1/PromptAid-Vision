# Image Preprocessing Service

This service automatically processes various image formats during upload to ensure compatibility and optimal storage.

## Overview

The `ImagePreprocessor` service automatically detects and converts various image formats to PNG or JPEG before storing them in the system. This ensures that all images are in a standard, web-compatible format.

## Supported Input Formats

### Direct Storage (No Preprocessing)
- **PNG** (`image/png`) - Already optimal format
- **JPEG** (`image/jpeg`, `image/jpg`) - Already optimal format

### Formats Requiring Preprocessing

#### HEIC/HEIF Files
- **Input**: HEIC/HEIF files from modern smartphones
- **Processing**: Convert to RGB and flatten alpha channel
- **Output**: PNG or JPEG

#### WebP Files
- **Input**: WebP format (Google's web image format)
- **Processing**: Convert to RGB and flatten alpha channel
- **Output**: PNG or JPEG

#### GIF Files
- **Input**: GIF files (static or animated)
- **Processing**: Extract first frame for animated GIFs, convert to RGB
- **Output**: PNG or JPEG

#### TIFF/GeoTIFF Files
- **Input**: TIFF or GeoTIFF files
- **Processing**: Render RGB view, handle various color spaces
- **Output**: PNG or JPEG

#### PDF Files
- **Input**: PDF documents
- **Processing**: Rasterize first page at 2x zoom for quality
- **Output**: PNG or JPEG
- **Performance Note**: PDF processing is inherently slower due to complex format parsing and rasterization

## How It Works

### 1. MIME Type Detection
The service first detects the file format using:
- File extension analysis
- File signature (magic bytes) detection
- Fallback to generic binary if unknown

### 2. Preprocessing Decision
- If format is already PNG/JPEG → No processing needed
- If format requires conversion → Apply appropriate processor

### 3. Format Conversion
Each format has a specialized processor that:
- Opens the file using appropriate library (PIL, PyMuPDF)
- Converts to RGB color space
- Flattens alpha channels
- Optimizes output quality
- Generates new filename with correct extension

### 4. Storage
- Processed image is stored with new filename
- Original filename is preserved in metadata
- SHA256 hash is calculated from processed content

## Integration Points

### Upload Endpoint (`/api/images/`)
- All file uploads go through preprocessing
- Supports drag & drop and file picker
- Handles both crisis maps and drone imagery

### Contribution Endpoint (`/api/contribute/from-url`)
- Images contributed from existing URLs are also preprocessed
- Ensures consistency across all image sources

## Configuration

### Target Format
- **Default**: PNG (better quality, lossless)
- **Alternative**: JPEG (smaller file size, lossy)
- **Quality**: 95% for JPEG (configurable)

### Error Handling
- If preprocessing fails, falls back to original content
- Logs errors for debugging
- Continues upload process

## Dependencies

- **Pillow (PIL)**: Core image processing
- **PyMuPDF**: PDF rasterization
- **Python standard library**: MIME type detection, file handling

## Benefits

1. **Format Consistency**: All stored images are in web-compatible formats
2. **Quality Assurance**: Automatic optimization and color space conversion
3. **User Experience**: Users can upload any common image format
4. **Storage Efficiency**: Optimized file sizes and formats
5. **Compatibility**: Ensures images work across all platforms and browsers

## Example Usage

```python
from app.services.image_preprocessor import ImagePreprocessor

# Process an image
processed_content, new_filename, mime_type = ImagePreprocessor.preprocess_image(
    file_content,
    "original.heic",
    target_format='PNG',
    quality=95
)

# Check if preprocessing is needed
if ImagePreprocessor.needs_preprocessing(mime_type):
    print(f"Converting {mime_type} to PNG...")
```

## Error Handling

The service gracefully handles errors:
- **Unsupported formats**: Falls back to generic processing
- **Corrupted files**: Logs error and continues with original
- **Processing failures**: Maintains upload functionality
- **Memory issues**: Handles large files efficiently

## Performance Considerations

### PDF Processing Performance
PDF conversion is the most computationally expensive operation due to:
- **Complex Format**: PDFs require parsing, interpretation, and rendering
- **Rasterization**: Vector-to-pixel conversion is CPU-intensive
- **Memory Usage**: Large PDFs can consume significant memory
- **Quality vs Speed**: Higher zoom factors increase quality but decrease speed

### Performance Tuning Options
```python
from app.services.image_preprocessor import ImagePreprocessor

# Fast mode - lower quality, much faster
ImagePreprocessor.configure_pdf_processing(quality_mode='fast')

# Balanced mode - good quality, reasonable speed (default)
ImagePreprocessor.configure_pdf_processing(quality_mode='balanced')

# Quality mode - highest quality, slower processing
ImagePreprocessor.configure_pdf_processing(quality_mode='quality')

# Custom configuration
ImagePreprocessor.configure_pdf_processing(
    zoom_factor=1.2,      # Lower zoom = faster
    compress_level=4,     # Lower compression = faster
    quality_mode='balanced'
)
```

### Expected Processing Times
- **Small PDFs (<1MB)**: 2-5 seconds
- **Medium PDFs (1-5MB)**: 5-15 seconds  
- **Large PDFs (5-25MB)**: 15-60 seconds
- **Complex PDFs**: May take longer due to graphics complexity

## Future Enhancements

- **Batch processing**: Process multiple images simultaneously
- **Format preferences**: User-configurable output formats
- **Quality settings**: Adjustable compression levels
- **Metadata preservation**: Keep EXIF and other metadata
- **Progressive processing**: Stream large files
