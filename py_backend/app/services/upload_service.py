"""
Upload Service
Handles the core business logic for image uploads and processing
"""
import logging
import io
from typing import Optional, Dict, Any, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session

from .. import crud, schemas, storage
from ..services.image_preprocessor import ImagePreprocessor
from ..services.thumbnail_service import ImageProcessingService
from ..services.vlm_service import vlm_manager
from ..utils.image_utils import convert_image_to_dict

logger = logging.getLogger(__name__)

class UploadService:
    """Service for handling image upload operations"""
    
    @staticmethod
    async def process_single_upload(
        file: UploadFile,
        source: Optional[str],
        event_type: str,
        countries: str,
        epsg: str,
        image_type: str,
        title: str,
        model_name: Optional[str],
        # Drone-specific fields
        center_lon: Optional[float] = None,
        center_lat: Optional[float] = None,
        amsl_m: Optional[float] = None,
        agl_m: Optional[float] = None,
        heading_deg: Optional[float] = None,
        yaw_deg: Optional[float] = None,
        pitch_deg: Optional[float] = None,
        roll_deg: Optional[float] = None,
        rtk_fix: Optional[bool] = None,
        std_h_m: Optional[float] = None,
        std_v_m: Optional[float] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Process a single image upload"""
        logger.info(f"Processing single upload: {file.filename}")
        
        # Parse and validate input
        countries_list = [c.strip() for c in countries.split(',') if c.strip()] if countries else []
        
        # Set defaults based on image type
        if image_type == "drone_image":
            if not event_type or event_type.strip() == "":
                event_type = "OTHER"
            if not epsg or epsg.strip() == "":
                epsg = "OTHER"
        else:
            if not source or source.strip() == "":
                source = "OTHER"
            if not event_type or event_type.strip() == "":
                event_type = "OTHER"
            if not epsg or epsg.strip() == "":
                epsg = "OTHER"
            
            # Clear drone fields for non-drone images
            center_lon = center_lat = amsl_m = agl_m = None
            heading_deg = yaw_deg = pitch_deg = roll_deg = None
            rtk_fix = std_h_m = std_v_m = None
        
        if not image_type or image_type.strip() == "":
            image_type = "crisis_map"
        
        # Read file content
        content = await file.read()
        
        # Preprocess image
        preprocessing_info = await UploadService._preprocess_image(content, file.filename)
        
        # Upload to storage
        key, sha = await UploadService._upload_to_storage(
            preprocessing_info['processed_content'],
            preprocessing_info['processed_filename'],
            preprocessing_info['mime_type']
        )
        
        # Generate thumbnails and detail versions
        thumbnail_result, detail_result = await UploadService._generate_image_versions(
            preprocessing_info['processed_content'],
            preprocessing_info['processed_filename']
        )
        
        # Create database record
        img = crud.create_image(
            db, source, event_type, key, sha, countries_list, epsg, image_type,
            center_lon, center_lat, amsl_m, agl_m,
            heading_deg, yaw_deg, pitch_deg, roll_deg,
            rtk_fix, std_h_m, std_v_m,
            thumbnail_key=thumbnail_result[0] if thumbnail_result else None,
            detail_key=detail_result[0] if detail_result else None
        )
        
        # Generate caption if requested
        if title or model_name:
            await UploadService._generate_caption(
                img, preprocessing_info['processed_content'], title, model_name, db
            )
        
        # Generate response
        url = storage.get_object_url(key)
        img_dict = convert_image_to_dict(img, url)
        img_dict['preprocessing_info'] = preprocessing_info
        
        logger.info(f"Successfully processed upload: {img.image_id}")
        return {
            'image': schemas.ImageOut(**img_dict),
            'preprocessing_info': preprocessing_info
        }
    
    @staticmethod
    async def process_multi_upload(
        files: list[UploadFile],
        source: Optional[str],
        event_type: str,
        countries: str,
        epsg: str,
        image_type: str,
        title: str,
        model_name: Optional[str],
        # Drone-specific fields
        center_lon: Optional[float] = None,
        center_lat: Optional[float] = None,
        amsl_m: Optional[float] = None,
        agl_m: Optional[float] = None,
        heading_deg: Optional[float] = None,
        yaw_deg: Optional[float] = None,
        pitch_deg: Optional[float] = None,
        roll_deg: Optional[float] = None,
        rtk_fix: Optional[bool] = None,
        std_h_m: Optional[float] = None,
        std_v_m: Optional[float] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Process multiple image uploads"""
        logger.info(f"Processing multi upload: {len(files)} files")
        
        results = []
        for file in files:
            try:
                result = await UploadService.process_single_upload(
                    file, source, event_type, countries, epsg, image_type,
                    title, model_name, center_lon, center_lat, amsl_m, agl_m,
                    heading_deg, yaw_deg, pitch_deg, roll_deg,
                    rtk_fix, std_h_m, std_v_m, db
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process file {file.filename}: {str(e)}")
                results.append({
                    'error': str(e),
                    'filename': file.filename
                })
        
        logger.info(f"Multi upload completed: {len(results)} results")
        return {
            'results': results,
            'total_files': len(files),
            'successful': len([r for r in results if 'error' not in r])
        }
    
    @staticmethod
    async def _preprocess_image(content: bytes, filename: str) -> Dict[str, Any]:
        """Preprocess an image file"""
        logger.debug(f"Preprocessing image: {filename}")
        
        try:
            processed_content, processed_filename, mime_type = ImagePreprocessor.preprocess_image(
                content, 
                filename,
                target_format='PNG',
                quality=95
            )
            
            preprocessing_info = {
                "original_filename": filename,
                "processed_filename": processed_filename,
                "original_mime_type": ImagePreprocessor.detect_mime_type(content, filename),
                "processed_mime_type": mime_type,
                "processed_content": processed_content,
                "was_preprocessed": processed_filename != filename
            }
            
            if processed_filename != filename:
                logger.info(f"Image preprocessed: {filename} -> {processed_filename}")
            
            return preprocessing_info
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            # Fall back to original content
            return {
                "original_filename": filename,
                "processed_filename": filename,
                "original_mime_type": "unknown",
                "processed_mime_type": "image/png",
                "processed_content": content,
                "was_preprocessed": False,
                "error": str(e)
            }
    
    @staticmethod
    async def _upload_to_storage(content: bytes, filename: str, mime_type: str) -> Tuple[str, str]:
        """Upload content to storage and return key and SHA256"""
        logger.debug(f"Uploading to storage: {filename}")
        
        key = storage.upload_fileobj(
            io.BytesIO(content), 
            filename, 
            content_type=mime_type
        )
        
        sha = crud.hash_bytes(content)
        logger.debug(f"Uploaded to key: {key}, SHA: {sha}")
        
        return key, sha
    
    @staticmethod
    async def _generate_image_versions(content: bytes, filename: str) -> Tuple[Optional[Tuple], Optional[Tuple]]:
        """Generate thumbnail and detail versions of the image"""
        logger.debug(f"Generating image versions: {filename}")
        
        try:
            thumbnail_result = ImageProcessingService.create_and_upload_thumbnail(
                content, filename
            )
            
            detail_result = ImageProcessingService.create_and_upload_detail(
                content, filename
            )
            
            if thumbnail_result:
                logger.info(f"Thumbnail generated: {thumbnail_result[0]}")
            if detail_result:
                logger.info(f"Detail version generated: {detail_result[0]}")
            
            return thumbnail_result, detail_result
            
        except Exception as e:
            logger.error(f"Image version generation failed: {str(e)}")
            return None, None
    
    @staticmethod
    async def _generate_caption(img, image_content: bytes, title: str, model_name: Optional[str], db: Session):
        """Generate caption for the uploaded image"""
        if not title and not model_name:
            return
        
        logger.debug(f"Generating caption for image {img.image_id}")
        
        try:
            # Get active prompt for image type
            prompt_obj = crud.get_active_prompt_by_image_type(db, img.image_type)
            if not prompt_obj:
                logger.warning(f"No active prompt found for image type: {img.image_type}")
                return
            
            # Generate caption using VLM service
            result = await vlm_manager.generate_caption(
                image_content=image_content,
                prompt=prompt_obj.label,
                metadata_instructions=prompt_obj.metadata_instructions or "",
                model_name=model_name,
                db_session=db
            )
            
            # Create caption record
            crud.create_caption(
                db=db,
                image_id=img.image_id,
                title=title or result.get("title", ""),
                prompt=prompt_obj.p_code,
                model_code=result.get("model", model_name or "STUB_MODEL"),
                raw_json=result.get("raw_response", {}),
                text=result.get("text", ""),
                metadata=result.get("metadata", {}),
                image_count=1
            )
            
            logger.info(f"Caption generated for image {img.image_id}")
            
        except Exception as e:
            logger.error(f"Caption generation failed: {str(e)}")
            # Continue without caption if generation fails
