import hashlib
import mimetypes
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import SessionLocal
from ..models import Images, image_countries
from ..images import CreateImageFromUrlIn, CreateImageFromUrlOut
from .. import storage
from ..storage import upload_bytes, get_object_url
from ..config import settings

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/from-url", response_model=CreateImageFromUrlOut)
async def create_image_from_url(payload: CreateImageFromUrlIn, db: Session = Depends(get_db)):
    try:
        print(f"DEBUG: Creating contribution from URL: {payload.url}")
        print(f"DEBUG: Payload: {payload}")
        
        # Check database connectivity
        try:
            db.execute(text("SELECT 1"))
            print("✓ Database connection OK")
        except Exception as db_error:
            print(f"✗ Database connection failed: {db_error}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {db_error}")
        
        # Check if required tables exist
        try:
            db.execute(text("SELECT 1 FROM sources LIMIT 1"))
            db.execute(text("SELECT 1 FROM event_types LIMIT 1")) 
            db.execute(text("SELECT 1 FROM spatial_references LIMIT 1"))
            db.execute(text("SELECT 1 FROM image_types LIMIT 1"))
            print("✓ Required tables exist")
        except Exception as table_error:
            print(f"✗ Required tables missing: {table_error}")
            raise HTTPException(status_code=500, detail=f"Required tables missing: {table_error}")
        
        if '/api/images/' in payload.url and '/file' in payload.url:
            url_parts = payload.url.split('/api/images/')
            if len(url_parts) > 1:
                image_id = url_parts[1].split('/file')[0]
            else:
                raise HTTPException(status_code=400, detail="Invalid image URL format")
        else:
            raise HTTPException(status_code=400, detail="Invalid image URL format")
        
        print(f"DEBUG: Extracted image_id: {image_id}")
        
        existing_image = db.query(Images).filter(Images.image_id == image_id).first()
        if not existing_image:
            raise HTTPException(status_code=404, detail="Source image not found")
        
        print(f"DEBUG: Found existing image: {existing_image.image_id}")
        
        try:
            if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
                print(f"DEBUG: Using S3 storage, bucket: {settings.S3_BUCKET}")
                response = storage.s3.get_object(
                    Bucket=settings.S3_BUCKET,
                    Key=existing_image.file_key,
                )
                data = response["Body"].read()
            else:
                print(f"DEBUG: Using local storage: {settings.STORAGE_DIR}")
                import os
                file_path = os.path.join(settings.STORAGE_DIR, existing_image.file_key)
                with open(file_path, 'rb') as f:
                    data = f.read()
            
            content_type = "image/jpeg"
            print(f"DEBUG: Image data size: {len(data)} bytes")
        except Exception as e:
            print(f"ERROR: Failed to fetch image from storage: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch image from storage: {e}")
        
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image too large")

        ext = mimetypes.guess_extension(content_type) or ".jpg"
        key = upload_bytes(data, filename=f"contributed{ext}", content_type=content_type)
        image_url = get_object_url(key, expires_in=86400)
        
        print(f"DEBUG: Uploaded to key: {key}")
        print(f"DEBUG: Generated URL: {image_url}")

        sha = hashlib.sha256(data).hexdigest()
        print(f"DEBUG: Generated SHA256: {sha}")

        # Set prompt and schema based on image type
        prompt_code = "DEFAULT_CRISIS_MAP"
        schema_id = "default_caption@1.0.0"
        if payload.image_type == "drone_image":
            prompt_code = "DEFAULT_DRONE_IMAGE"
            schema_id = "drone_caption@1.0.0"
        

        if payload.image_type == "drone_image":
            source = payload.source
            event_type = payload.event_type if payload.event_type else "OTHER"
            epsg = payload.epsg if payload.epsg else "OTHER"
        else:
            source = payload.source if payload.source else "OTHER"
            event_type = payload.event_type if payload.event_type else "OTHER"
            epsg = payload.epsg if payload.epsg else "OTHER"
        
        if payload.image_type != "drone_image":
            payload.center_lon = None
            payload.center_lat = None
            payload.amsl_m = None
            payload.agl_m = None
            payload.heading_deg = None
            payload.yaw_deg = None
            payload.pitch_deg = None
            payload.roll_deg = None
            payload.rtk_fix = None
            payload.std_h_m = None
            payload.std_v_m = None
        
        img = Images(
            file_key=key,
            sha256=sha,
            source=source,
            event_type=event_type,
            epsg=epsg,
            image_type=payload.image_type,
            title="no title",
            prompt=prompt_code,
            model="STUB_MODEL",
            schema_id=schema_id,
            raw_json={},
            generated="",
            edited="",
            accuracy=50,
            context=50,
            usability=50,
            starred=False,
            center_lon=payload.center_lon,
            center_lat=payload.center_lat,
            amsl_m=payload.amsl_m,
            agl_m=payload.agl_m,
            heading_deg=payload.heading_deg,
            yaw_deg=payload.yaw_deg,
            pitch_deg=payload.pitch_deg,
            roll_deg=payload.roll_deg,
            rtk_fix=payload.rtk_fix,
            std_h_m=payload.std_h_m,
            std_v_m=payload.std_v_m
        )
        
        print(f"DEBUG: Created Images object: {img}")
        db.add(img)
        db.flush()
        print(f"DEBUG: Flushed to database, image_id: {img.image_id}")

        for c in payload.countries:
            print(f"DEBUG: Adding country: {c}")
            db.execute(image_countries.insert().values(image_id=img.image_id, c_code=c))

        print(f"DEBUG: About to commit transaction")
        db.commit()
        print(f"DEBUG: Transaction committed successfully")

        result = CreateImageFromUrlOut(image_id=str(img.image_id), image_url=image_url)
        print(f"DEBUG: Returning result: {result}")
        return result
        
    except Exception as e:
        print(f"ERROR: Exception in create_image_from_url: {e}")
        print(f"ERROR: Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create image: {str(e)}")

@router.get("/debug/db-status")
async def debug_database_status(db: Session = Depends(get_db)):
    """Debug endpoint to check database status"""
    try:
        status = {}
        
        # Check basic connectivity
        try:
            db.execute(text("SELECT 1"))
            status["database_connection"] = "OK"
        except Exception as e:
            status["database_connection"] = f"FAILED: {e}"
            return status
        
        # Check required tables
        tables_to_check = [
            "sources", "event_types", "spatial_references", "image_types",
            "prompts", "models", "json_schemas", "images", "image_countries"
        ]
        
        for table in tables_to_check:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                status[f"table_{table}"] = f"EXISTS ({count} rows)"
            except Exception as e:
                status[f"table_{table}"] = f"MISSING: {e}"
        
        # Check foreign key constraints
        try:
            # Check if we can create a simple Images object
            from ..models import Images
            test_img = Images(
                file_key="test",
                sha256="test",
                source="OTHER",
                event_type="OTHER", 
                epsg="OTHER",
                image_type="crisis_map"
            )
            status["model_creation"] = "OK"
        except Exception as e:
            status["model_creation"] = f"FAILED: {e}"
        
        return status
        
    except Exception as e:
        return {"error": str(e)}
