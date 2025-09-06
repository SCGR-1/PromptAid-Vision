#!/usr/bin/env python3
"""
Quick fix for production - add image_type column with default values
"""

from app.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def quick_fix():
    """Add image_type column with default values to prevent 500 errors"""
    
    try:
        with engine.connect() as connection:
            trans = connection.begin()
            
            try:
                # Check if column already exists
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'json_schemas' AND column_name = 'image_type'
                """))
                
                if result.fetchone():
                    logger.info("image_type column already exists")
                else:
                    # Add column with default value
                    logger.info("Adding image_type column...")
                    connection.execute(text("ALTER TABLE json_schemas ADD COLUMN image_type VARCHAR DEFAULT 'crisis_map';"))
                    
                    # Update existing schemas
                    logger.info("Updating existing schemas...")
                    connection.execute(text("UPDATE json_schemas SET image_type = 'crisis_map' WHERE schema_id = 'default_caption@1.0.0';"))
                    connection.execute(text("UPDATE json_schemas SET image_type = 'drone_image' WHERE schema_id = 'drone_caption@1.0.0';"))
                
                trans.commit()
                logger.info("Quick fix applied successfully!")
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Quick fix failed: {str(e)}")
                raise
                
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise

if __name__ == "__main__":
    quick_fix()
