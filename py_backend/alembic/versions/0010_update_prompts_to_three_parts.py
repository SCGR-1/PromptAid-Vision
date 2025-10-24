"""Update prompts to three-part structure: description, analysis, recommended actions

Revision ID: 0010
Revises: 0009
Create Date: 2025-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = '0010'
down_revision = '0009_add_delete_count_to_models'
branch_labels = None
depends_on = None


def upgrade():
    # Update DEFAULT_CRISIS_MAP prompt
    op.execute(sa.text("""
        UPDATE prompts 
        SET label = 'Analyze this crisis map and provide a structured response with description, analysis, and recommended actions.',
             metadata_instructions = 'Additionally, extract the following metadata in JSON format. Choose exactly ONE option from each category:

- title: Create a concise title (less than 10 words) for the crisis/event
- source: Choose ONE from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER
- type: Choose ONE from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION
- countries: List of affected country codes (ISO 2-letter codes like PA, US, etc.)
- epsg: Choose ONE from: 4326, 3857, 32617, 32633, 32634, OTHER. If the map shows a different EPSG code, use "OTHER"

IMPORTANT: Only include information that you are confident about. It is good to leave fields blank if unsure.

Return ONLY the JSON object (no markdown formatting) in this exact format:
{
  "description": "Objective description of what is visible in the map...",
  "analysis": "Detailed analysis of the emergency situation, affected areas, and key information...",
  "recommended_actions": "Specific actions that should be taken based on the crisis map...",
  "metadata": {
    "title": "...",
    "source": "...",
    "type": "...",
    "countries": ["..."],
    "epsg": "..."
  }
}'
        WHERE p_code = 'DEFAULT_CRISIS_MAP'
    """))

    # Update DEFAULT_DRONE_IMAGE prompt
    op.execute(sa.text("""
        UPDATE prompts 
        SET label = 'Analyze this drone image and provide a structured response with description, analysis, and recommended actions.',
             metadata_instructions = 'Additionally, extract the following metadata in JSON format. All fields are optional - use null when unknown:

- title: concise title (<= 10 words)
- source: if applicable, choose from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER, otherwise null
- type: if applicable, choose from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION, otherwise null
- countries: if applicable, use ISO-2 codes (e.g., [''US'',''PA'']), otherwise null
- epsg: if applicable, choose from: 4326, 3857, 32617, 32633, 32634, OTHER, otherwise null
- center_lat (-90..90), center_lon (-180..180)
- amsl_m, agl_m
- heading_deg (0..360), yaw_deg (-180..180), pitch_deg (-90..90), roll_deg (-180..180)
- rtk_fix (boolean), std_h_m (>=0), std_v_m (>=0)

IMPORTANT: Only include information that you are confident about. It is good to leave fields blank if unsure.

Return ONLY the JSON object (no markdown) in this envelope:
{
  "description": "Objective description of what is visible in the drone image...",
  "analysis": "Detailed analysis of the situation, damage assessment, and context...",
  "recommended_actions": "Specific actions that should be taken based on the drone imagery...",
  "metadata": {
    "title": "...",
    "source": <string|null>,
    "type": <string|null>,
    "countries": <array|null>,
    "epsg": <string|null>,
    "center_lat": <number|null>,
    "center_lon": <number|null>,
    "amsl_m": <number|null>,
    "agl_m": <number|null>,
    "heading_deg": <number|null>,
    "yaw_deg": <number|null>,
    "pitch_deg": <number|null>,
    "roll_deg": <number|null>,
    "rtk_fix": <boolean|null>,
    "std_h_m": <number|null>,
    "std_v_m": <number|null>
  }
}'
        WHERE p_code = 'DEFAULT_DRONE_IMAGE'
    """))

    # Update default_caption@1.0.0 schema
    op.execute(sa.text("""
        UPDATE json_schemas 
        SET schema = '{"type":"object","properties":{"description":{"type":"string"},"analysis":{"type":"string"},"recommended_actions":{"type":"string"},"metadata":{"type":"object","properties":{"title":{"type":"string"},"source":{"type":"string"},"type":{"type":"string"},"countries":{"type":"array","items":{"type":"string"}},"epsg":{"type":"string"}}}},"required":["description","analysis","recommended_actions","metadata"]}'
        WHERE schema_id = 'default_caption@1.0.0'
    """))

    # Update drone_caption@1.0.0 schema
    drone_schema = {
        "type": "object",
        "properties": {
            "description": {"type": "string"},
            "analysis": {"type": "string"},
            "recommended_actions": {"type": "string"},
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
                    "std_v_m": {"type": ["number", "null"], "minimum": 0},
                },
            },
        },
        "required": ["description", "analysis", "recommended_actions", "metadata"],
    }

    op.execute(sa.text("""
        UPDATE json_schemas 
        SET schema = :schema::jsonb
        WHERE schema_id = 'drone_caption@1.0.0'
    """).bindparams(schema=json.dumps(drone_schema, separators=(",", ":"))))


def downgrade():
    # Revert DEFAULT_CRISIS_MAP prompt
    op.execute(sa.text("""
        UPDATE prompts 
        SET label = 'Analyze this crisis map and provide a detailed description of the emergency situation, affected areas, and key information shown in the map.',
             metadata_instructions = 'Additionally, extract the following metadata in JSON format. Choose exactly ONE option from each category:

- title: Create a concise title (less than 10 words) for the crisis/event
- source: Choose ONE from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER
- type: Choose ONE from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION
- countries: List of affected country codes (ISO 2-letter codes like PA, US, etc.)
- epsg: Choose ONE from: 4326, 3857, 32617, 32633, 32634, OTHER. If the map shows a different EPSG code, use "OTHER"

If you cannot find a match, use "OTHER". Return ONLY the JSON object (no markdown formatting) in this exact format:
{
  "analysis": "detailed description...",
  "metadata": {
    "title": "...",
    "source": "...",
    "type": "...",
    "countries": ["..."],
    "epsg": "..."
  }
}'
        WHERE p_code = 'DEFAULT_CRISIS_MAP'
    """))

    # Revert DEFAULT_DRONE_IMAGE prompt
    op.execute(sa.text("""
        UPDATE prompts 
        SET label = 'Analyze this drone image and provide an objective, concise description of what is visible (people, infrastructure, damage, hazards, access, context).',
             metadata_instructions = 'Additionally, extract the following metadata in JSON format. All fields are optional - use null when unknown:

- title: concise title (<= 10 words)
- source: if applicable, choose from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER, otherwise null
- type: if applicable, choose from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION, otherwise null
- countries: if applicable, use ISO-2 codes (e.g., [''US'',''PA'']), otherwise null
- epsg: if applicable, choose from: 4326, 3857, 32617, 32633, 32634, OTHER, otherwise null
- center_lat (-90..90), center_lon (-180..180)
- amsl_m, agl_m
- heading_deg (0..360), yaw_deg (-180..180), pitch_deg (-90..90), roll_deg (-180..180)
- rtk_fix (boolean), std_h_m (>=0), std_v_m (>=0)

Return ONLY the JSON object (no markdown) in this envelope:
{
  "analysis": "detailed description...",
  "metadata": {
    "title": "...",
    "source": <string|null>,
    "type": <string|null>,
    "countries": <array|null>,
    "epsg": <string|null>,
    "center_lat": <number|null>,
    "center_lon": <number|null>,
    "amsl_m": <number|null>,
    "agl_m": <number|null>,
    "heading_deg": <number|null>,
    "yaw_deg": <number|null>,
    "pitch_deg": <number|null>,
    "roll_deg": <number|null>,
    "rtk_fix": <boolean|null>,
    "std_h_m": <number|null>,
    "std_v_m": <number|null>
  }
}'
        WHERE p_code = 'DEFAULT_DRONE_IMAGE'
    """))

    # Revert default_caption@1.0.0 schema
    op.execute(sa.text("""
        UPDATE json_schemas 
        SET schema = '{"type":"object","properties":{"analysis":{"type":"string"},"metadata":{"type":"object","properties":{"title":{"type":"string"},"source":{"type":"string"},"type":{"type":"string"},"countries":{"type":"array","items":{"type":"string"}},"epsg":{"type":"string"}}}},"required":["analysis","metadata"]}'
        WHERE schema_id = 'default_caption@1.0.0'
    """))

    # Revert drone_caption@1.0.0 schema
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
                    "std_v_m": {"type": ["number", "null"], "minimum": 0},
                },
            },
        },
        "required": ["analysis", "metadata"],
    }

    op.execute(sa.text("""
        UPDATE json_schemas 
        SET schema = :schema::jsonb
        WHERE schema_id = 'drone_caption@1.0.0'
    """).bindparams(schema=json.dumps(drone_schema, separators=(",", ":"))))
