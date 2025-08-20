"""Fix JSON schemas to match validation requirements

Revision ID: 0003_fix_json_schemas
Revises: 0002_drone_pose_fields_and_schema
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = '0003_fix_json_schemas'
down_revision = '0002_drone_fields'
branch_labels = None
depends_on = None


def upgrade():
    """Fix the JSON schemas to match validation requirements"""
    
    # Fix the default crisis map schema
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
    
    op.execute(
        sa.text(
            """
            UPDATE json_schemas 
            SET schema = CAST(:schema AS JSONB)
            WHERE schema_id = 'default_caption@1.0.0'
            """
        ).bindparams(
            schema=json.dumps(crisis_schema, separators=(",", ":"))
        )
    )
    
    # Fix the drone schema (the current one is mostly correct, but let's ensure it's perfect)
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
    
    op.execute(
        sa.text(
            """
            UPDATE json_schemas 
            SET schema = CAST(:schema AS JSONB)
            WHERE schema_id = 'drone_caption@1.0.0'
            """
        ).bindparams(
            schema=json.dumps(drone_schema, separators=(",", ":"))
        )
    )
    
    print("✓ Updated JSON schemas to match validation requirements")


def downgrade():
    """Revert to previous schema versions"""
    
    # Revert crisis map schema to original
    original_crisis_schema = {
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
                }
            }
        },
        "required": ["analysis", "metadata"]
    }
    
    op.execute(
        sa.text(
            """
            UPDATE json_schemas 
            SET schema = CAST(:schema AS JSONB)
            WHERE schema_id = 'default_caption@1.0.0'
            """
        ).bindparams(
            schema=json.dumps(original_crisis_schema, separators=(",", ":"))
        )
    )
    
    # Revert drone schema to original
    original_drone_schema = {
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
    
    op.execute(
        sa.text(
            """
            UPDATE json_schemas 
            SET schema = CAST(:schema AS JSONB)
            WHERE schema_id = 'drone_caption@1.0.0'
            """
        ).bindparams(
            schema=json.dumps(original_drone_schema, separators=(",", ":"))
        )
    )
    
    print("✓ Reverted JSON schemas to previous versions")
