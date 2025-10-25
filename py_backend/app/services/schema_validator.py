import json
from typing import Dict, Any, Optional, Tuple
from jsonschema import validate, ValidationError
from jsonschema.validators import Draft7Validator
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud

logger = logging.getLogger(__name__)

class SchemaValidator:
    """Service for validating JSON data against stored schemas"""
    
    def __init__(self):
        self.validators = {}
        self._schema_cache = {}
    
    def _get_schema_from_db(self, schema_id: str) -> Optional[Dict[str, Any]]:
        """Fetch schema from database with caching"""
        if schema_id in self._schema_cache:
            return self._schema_cache[schema_id]
        
        try:
            db = SessionLocal()
            schema_obj = crud.get_schema(db, schema_id)
            if schema_obj:
                self._schema_cache[schema_id] = schema_obj.schema
                return schema_obj.schema
            else:
                logger.warning(f"Schema {schema_id} not found in database")
                return None
        except Exception as e:
            logger.error(f"Error fetching schema {schema_id} from database: {str(e)}")
            return None
        finally:
            db.close()
    
    def _get_schema_by_image_type(self, image_type: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Fetch schema by image type from database"""
        try:
            db = SessionLocal()
            schemas = crud.get_schemas_by_image_type(db, image_type)
            if schemas:
                # Return the first schema found (could be enhanced to handle multiple schemas)
                schema_obj = schemas[0]
                return schema_obj.schema_id, schema_obj.schema
            else:
                logger.warning(f"No schema found for image type: {image_type}")
                return None
        except Exception as e:
            logger.error(f"Error fetching schema for image type {image_type} from database: {str(e)}")
            return None
        finally:
            db.close()
    
    def clear_schema_cache(self, schema_id: Optional[str] = None):
        """Clear schema cache for a specific schema or all schemas"""
        if schema_id:
            self._schema_cache.pop(schema_id, None)
            logger.info(f"Cleared cache for schema {schema_id}")
        else:
            self._schema_cache.clear()
            logger.info("Cleared all schema cache")
    
    def validate_against_schema(self, data: Dict[str, Any], schema: Dict[str, Any], schema_id: str) -> Tuple[bool, Optional[str]]:
        """
        Validate JSON data against a schema
        
        Args:
            data: The JSON data to validate
            schema: The JSON schema to validate against
            schema_id: Identifier for the schema (for logging)
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            validator = Draft7Validator(schema)
            errors = list(validator.iter_errors(data))
            
            if errors:
                error_messages = []
                for error in errors:
                    path = " -> ".join(str(p) for p in error.path) if error.path else "root"
                    error_messages.append(f"{path}: {error.message}")
                
                error_msg = f"Schema validation failed for {schema_id}: {'; '.join(error_messages)}"
                logger.warning(error_msg)
                return False, error_msg
            
            logger.info(f"Schema validation passed for {schema_id}")
            return True, None
            
        except Exception as e:
            error_msg = f"Schema validation error for {schema_id}: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def validate_by_image_type(self, data: Dict[str, Any], image_type: str) -> Tuple[bool, Optional[str]]:
        """
        Validate data against schema based on image type
        """
        # Get schema by image type
        schema_result = self._get_schema_by_image_type(image_type)
        if not schema_result:
            logger.error(f"Failed to fetch schema for image type: {image_type}")
            return False, f"No schema found for image type: {image_type}"
        
        schema_id, schema = schema_result
        return self.validate_against_schema(data, schema, schema_id)
    
    def validate_crisis_map_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate crisis map data against the database schema (legacy method)
        """
        return self.validate_by_image_type(data, "crisis_map")
    
    def validate_drone_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate drone data against the database schema (legacy method)
        """
        return self.validate_by_image_type(data, "drone_image")
    
    def validate_data_by_type(self, data: Dict[str, Any], image_type: str) -> Tuple[bool, Optional[str]]:
        """
        Validate data based on image type
        
        Args:
            data: The JSON data to validate
            image_type: Either 'crisis_map' or 'drone_image'
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if image_type == 'drone_image':
            return self.validate_drone_data(data)
        elif image_type == 'crisis_map':
            return self.validate_crisis_map_data(data)
        else:
            return False, f"Unknown image type: {image_type}"
    
    def clean_and_validate_data(self, raw_data: Dict[str, Any], image_type: str) -> Tuple[Dict[str, Any], bool, Optional[str]]:
        """
        Clean and validate data, returning cleaned data, validation status, and any errors
        
        Args:
            raw_data: Raw data from VLM
            image_type: Type of image being processed
            
        Returns:
            Tuple of (cleaned_data, is_valid, error_message)
        """
        try:
            if "raw_response" in raw_data:
                ai_data = raw_data["raw_response"]
                
                if "response" in ai_data:
                    content = ai_data["response"]
                    if isinstance(content, str):
                        try:
                            data = json.loads(content)
                        except json.JSONDecodeError:
                            data = {"description": "", "analysis": content, "recommended_actions": "", "metadata": {}}
                    else:
                        data = content
                elif "description" in ai_data and "analysis" in ai_data and "recommended_actions" in ai_data and "metadata" in ai_data:
                    data = ai_data
                elif "analysis" in ai_data and "metadata" in ai_data:
                    # Backward compatibility for old format
                    data = {
                        "description": "",
                        "analysis": ai_data["analysis"],
                        "recommended_actions": "",
                        "metadata": ai_data["metadata"]
                    }
                else:
                    data = ai_data
            elif "content" in raw_data:
                content = raw_data["content"]
                if isinstance(content, str):
                    try:
                        parsed_content = json.loads(content)
                        data = parsed_content
                    except json.JSONDecodeError:
                        data = {"description": "", "analysis": content, "recommended_actions": "", "metadata": {}}
                else:
                    data = content
            else:
                data = raw_data
            
            is_valid, error_msg = self.validate_data_by_type(data, image_type)
            
            if is_valid:
                cleaned_data = self._clean_data(data, image_type)
                return cleaned_data, True, None
            else:
                return data, False, error_msg
                
        except Exception as e:
            error_msg = f"Data processing error: {str(e)}"
            logger.error(error_msg)
            return raw_data, False, error_msg
    
    def _clean_data(self, data: Dict[str, Any], image_type: str) -> Dict[str, Any]:
        """
        Clean and normalize the data structure
        """
        cleaned = {
            "description": data.get("description", ""),
            "analysis": data.get("analysis", ""),
            "recommended_actions": data.get("recommended_actions", ""),
            "metadata": {}
        }
        
        metadata = data.get("metadata", {})
        
        # Clean metadata based on image type
        if image_type == 'crisis_map':
            cleaned["metadata"] = {
                "title": metadata.get("title", ""),
                "source": metadata.get("source", "OTHER"),
                "type": metadata.get("type", "OTHER"),
                "countries": metadata.get("countries", []),
                "epsg": metadata.get("epsg", "OTHER")
            }
        elif image_type == 'drone_image':
            cleaned["metadata"] = {
                "title": metadata.get("title"),
                "source": metadata.get("source"),
                "type": metadata.get("type"),
                "countries": metadata.get("countries"),
                "epsg": metadata.get("epsg"),
                "center_lat": metadata.get("center_lat"),
                "center_lon": metadata.get("center_lon"),
                "amsl_m": metadata.get("amsl_m"),
                "agl_m": metadata.get("agl_m"),
                "heading_deg": metadata.get("heading_deg"),
                "yaw_deg": metadata.get("yaw_deg"),
                "pitch_deg": metadata.get("pitch_deg"),
                "roll_deg": metadata.get("roll_deg"),
                "rtk_fix": metadata.get("rtk_fix"),
                "std_h_m": metadata.get("std_h_m"),
                "std_v_m": metadata.get("std_v_m")
            }
        
        return cleaned

# Global instance
schema_validator = SchemaValidator()
