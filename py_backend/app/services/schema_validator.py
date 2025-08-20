import json
from typing import Dict, Any, Optional, Tuple
from jsonschema import validate, ValidationError
from jsonschema.validators import Draft7Validator
import logging

logger = logging.getLogger(__name__)

class SchemaValidator:
    """Service for validating JSON data against stored schemas"""
    
    def __init__(self):
        self.validators = {}
    
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
            # Use Draft7Validator for better error messages
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
    
    def validate_crisis_map_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate crisis map data against the default schema
        """
        # Define the expected crisis map schema
        crisis_schema = {
            "type": "object",
            "properties": {
                "analysis": {"type": "string"},
                "metadata": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "source": {"type": "string"},
                        "type": {"type": "string"},
                        "countries": {"type": "array", "items": {"type": "string"}},
                        "epsg": {"type": "string"}
                    },
                    "required": ["title", "source", "type", "countries", "epsg"]
                }
            },
            "required": ["analysis", "metadata"]
        }
        
        return self.validate_against_schema(data, crisis_schema, "crisis_map")
    
    def validate_drone_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate drone data against the drone schema
        """
        # Define the expected drone schema
        drone_schema = {
            "type": "object",
            "properties": {
                "analysis": {"type": "string"},
                "metadata": {
                    "type": "object",
                    "properties": {
                        "title": {"type": ["string", "null"]},
                        "source": {"type": ["string", "null"]},
                        "type": {"type": ["string", "null"]},
                        "countries": {"type": ["array", "null"], "items": {"type": "string"}},
                        "epsg": {"type": ["string", "null"]},
                        "center_lat": {"type": ["number", "null"], "minimum": -90, "maximum": 90},
                        "center_lon": {"type": ["number", "null"], "minimum": -180, "maximum": 180},
                        "amsl_m": {"type": ["number", "null"]},
                        "agl_m": {"type": ["number", "null"]},
                        "heading_deg": {"type": ["number", "null"], "minimum": 0, "maximum": 360},
                        "yaw_deg": {"type": ["number", "null"], "minimum": -180, "maximum": 180},
                        "pitch_deg": {"type": ["number", "null"], "minimum": -90, "maximum": 90},
                        "roll_deg": {"type": ["number", "null"], "minimum": -180, "maximum": 180},
                        "rtk_fix": {"type": ["boolean", "null"]},
                        "std_h_m": {"type": ["number", "null"], "minimum": 0},
                        "std_v_m": {"type": ["number", "null"], "minimum": 0}
                    }
                }
            },
            "required": ["analysis", "metadata"]
        }
        
        return self.validate_against_schema(data, drone_schema, "drone")
    
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
            # Extract the main content (handle different VLM response formats)
            if "content" in raw_data:
                # Some VLM models wrap content in a "content" field
                content = raw_data["content"]
                if isinstance(content, str):
                    # Try to parse JSON from string content
                    try:
                        parsed_content = json.loads(content)
                        data = parsed_content
                    except json.JSONDecodeError:
                        # If it's not JSON, treat as analysis
                        data = {"analysis": content, "metadata": {}}
                else:
                    data = content
            else:
                data = raw_data
            
            # Validate the data
            is_valid, error_msg = self.validate_data_by_type(data, image_type)
            
            if is_valid:
                # Clean the data (remove any extra fields, normalize)
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
            "analysis": data.get("analysis", ""),
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
