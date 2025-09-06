#!/usr/bin/env python3
"""
Check production database status for schema table
"""

from app.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_production_db():
    """Check the current state of the production database"""
    
    try:
        with engine.connect() as connection:
            
            # Check if json_schemas table exists
            logger.info("1. Checking if json_schemas table exists...")
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'json_schemas'
            """))
            
            if result.fetchone():
                logger.info("✓ json_schemas table exists")
            else:
                logger.error("✗ json_schemas table does not exist")
                return
            
            # Check table structure
            logger.info("2. Checking json_schemas table structure...")
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'json_schemas'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            logger.info("Current columns:")
            for col in columns:
                logger.info(f"  - {col.column_name}: {col.data_type} (nullable: {col.is_nullable})")
            
            # Check if image_type column exists
            has_image_type = any(col.column_name == 'image_type' for col in columns)
            if has_image_type:
                logger.info("✓ image_type column exists")
            else:
                logger.error("✗ image_type column missing - this is causing the 500 error")
            
            # Check existing schemas
            logger.info("3. Checking existing schemas...")
            result = connection.execute(text("SELECT schema_id, title FROM json_schemas"))
            schemas = result.fetchall()
            
            logger.info("Existing schemas:")
            for schema in schemas:
                logger.info(f"  - {schema.schema_id}: {schema.title}")
            
            # Check image_types table
            logger.info("4. Checking image_types table...")
            result = connection.execute(text("SELECT image_type, label FROM image_types"))
            image_types = result.fetchall()
            
            logger.info("Available image types:")
            for it in image_types:
                logger.info(f"  - {it.image_type}: {it.label}")
                
    except Exception as e:
        logger.error(f"Database check failed: {str(e)}")

if __name__ == "__main__":
    check_production_db()
