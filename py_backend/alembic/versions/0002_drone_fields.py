"""add drone pose fields to images + seed drone prompt & schema + make source nullable

Revision ID: 0002_drone_pose_fields_and_schema
Revises: 0001_initial_schema_and_seed
Create Date: 2025-08-19 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import json

# Alembic identifiers
revision = "0002_drone_fields"
down_revision = "b8fc40bfe3c7"
branch_labels = None
depends_on = None


def upgrade():
    # -------- Make source field nullable for drone images --------
    op.alter_column("images", "source", nullable=True)
    
    # -------- Add image pose/accuracy columns (all nullable) --------
    op.add_column("images", sa.Column("center_lon", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("center_lat", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("amsl_m", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("agl_m", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("heading_deg", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("yaw_deg", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("pitch_deg", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("roll_deg", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("rtk_fix", sa.Boolean(), nullable=True))
    op.add_column("images", sa.Column("std_h_m", sa.Float(precision=53), nullable=True))
    op.add_column("images", sa.Column("std_v_m", sa.Float(precision=53), nullable=True))

    # -------- Sanity checks (permit NULL) --------
    op.create_check_constraint(
        "chk_images_center_lat",
        "images",
        "(center_lat IS NULL) OR (center_lat BETWEEN -90 AND 90)",
    )
    op.create_check_constraint(
        "chk_images_center_lon",
        "images",
        "(center_lon IS NULL) OR (center_lon BETWEEN -180 AND 180)",
    )
    op.create_check_constraint(
        "chk_images_heading_deg",
        "images",
        "(heading_deg IS NULL) OR (heading_deg >= 0 AND heading_deg <= 360)",
    )
    op.create_check_constraint(
        "chk_images_pitch_deg",
        "images",
        "(pitch_deg IS NULL) OR (pitch_deg BETWEEN -90 AND 90)",
    )
    op.create_check_constraint(
        "chk_images_yaw_deg",
        "images",
        "(yaw_deg IS NULL) OR (yaw_deg BETWEEN -180 AND 180)",
    )
    op.create_check_constraint(
        "chk_images_roll_deg",
        "images",
        "(roll_deg IS NULL) OR (roll_deg BETWEEN -180 AND 180)",
    )

    # -------- Seed: default DRONE prompt (mirrors crisis-map prompt row) --------
    op.execute(
        sa.text(
            """
            INSERT INTO prompts (p_code, label, metadata_instructions)
            VALUES (:code, :label, :meta)
            ON CONFLICT (p_code) DO NOTHING
            """
        ).bindparams(
            code="DEFAULT_DRONE_IMAGE",
            label=(
                "Analyze this drone image and provide an objective, concise description "
                "of what is visible (people, infrastructure, damage, hazards, access, context)."
            ),
            meta=(
                "Additionally, extract the following metadata in JSON format. All fields are optional - use null when unknown:\n\n"
                "- title: concise title (<= 10 words)\n"
                "- source: if applicable, choose from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER, otherwise null\n"
                "- type: if applicable, choose from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION, otherwise null\n"
                "- countries: if applicable, use ISO-2 codes (e.g., ['US','PA']), otherwise null\n"
                "- epsg: if applicable, choose from: 4326, 3857, 32617, 32633, 32634, OTHER, otherwise null\n"
                "- center_lat (-90..90), center_lon (-180..180)\n"
                "- amsl_m, agl_m\n"
                "- heading_deg (0..360), yaw_deg (-180..180), pitch_deg (-90..90), roll_deg (-180..180)\n"
                "- rtk_fix (boolean), std_h_m (>=0), std_v_m (>=0)\n\n"
                "Return ONLY the JSON object (no markdown) in this envelope:\n"
                "{\n"
                '  "analysis": "detailed description...",\n'
                "  \"metadata\": {\n"
                '    "title": "...",\n'
                '    "source": <string|null>,\n'
                '    "type": <string|null>,\n'
                '    "countries": <array|null>,\n'
                '    "epsg": <string|null>,\n'
                '    "center_lat": <number|null>,\n'
                '    "center_lon": <number|null>,\n'
                '    "amsl_m": <number|null>,\n'
                '    "agl_m": <number|null>,\n'
                '    "heading_deg": <number|null>,\n'
                '    "yaw_deg": <number|null>,\n'
                '    "pitch_deg": <number|null>,\n'
                '    "roll_deg": <number|null>,\n'
                '    "rtk_fix": <boolean|null>,\n'
                '    "std_h_m": <number|null>,\n'
                '    "std_v_m": <number|null>\n'
                "  }\n"
                "}"
            ),
        )
    )

    # -------- Seed: DRONE caption JSON schema --------
    schema = {
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

    op.execute(
        sa.text(
            """
            INSERT INTO json_schemas (schema_id, title, schema, version)
            VALUES (:id, :title, CAST(:schema AS JSONB), :ver)
            ON CONFLICT (schema_id) DO NOTHING
            """
        ).bindparams(
            id="drone_caption@1.0.0",
            title="Drone Caption Schema",
            schema=json.dumps(schema, separators=(",", ":")),
            ver="1.0.0",
        )
    )


def downgrade():
    # Remove seeded rows
    op.execute(sa.text("DELETE FROM json_schemas WHERE schema_id = :id"), {"id": "drone_caption@1.0.0"})
    op.execute(sa.text("DELETE FROM prompts WHERE p_code = :code"), {"code": "DEFAULT_DRONE_IMAGE"})

    # Drop check constraints
    op.drop_constraint("chk_images_roll_deg", "images", type_="check")
    op.drop_constraint("chk_images_yaw_deg", "images", type_="check")
    op.drop_constraint("chk_images_pitch_deg", "images", type_="check")
    op.drop_constraint("chk_images_heading_deg", "images", type_="check")
    op.drop_constraint("chk_images_center_lon", "images", type_="check")
    op.drop_constraint("chk_images_center_lat", "images", type_="check")

    # Drop columns
    op.drop_column("images", "std_v_m")
    op.drop_column("images", "std_h_m")
    op.drop_column("images", "rtk_fix")
    op.drop_column("images", "roll_deg")
    op.drop_column("images", "pitch_deg")
    op.drop_column("images", "yaw_deg")
    op.drop_column("images", "heading_deg")
    op.drop_column("images", "agl_m")
    op.drop_column("images", "amsl_m")
    op.drop_column("images", "center_lat")
    op.drop_column("images", "center_lon")

    # Make source field non-nullable again
    op.alter_column("images", "source", nullable=False)
