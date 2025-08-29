"""Debug and fix prompts table issues

Revision ID: 0015
Revises: 0014
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None

def upgrade():
    # Debug: Check what's in the prompts table
    connection = op.get_bind()
    
    # First, let's see what columns exist
    result = connection.execute(sa.text("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        ORDER BY ordinal_position
    """))
    
    print("=== Current prompts table structure ===")
    for row in result:
        print(f"Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}")
    
    # Check if there are any prompts in the table
    result = connection.execute(sa.text("SELECT COUNT(*) FROM prompts"))
    prompt_count = result.scalar()
    print(f"=== Total prompts in table: {prompt_count} ===")
    
    if prompt_count > 0:
        # Show what prompts exist
        result = connection.execute(sa.text("SELECT p_code, label, image_type, is_active FROM prompts"))
        print("=== Existing prompts ===")
        for row in result:
            print(f"Code: {row[0]}, Label: {row[1]}, Image Type: {row[2]}, Active: {row[3]}")
    
    # Check if the required columns exist and have proper constraints
    result = connection.execute(sa.text("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'image_type'
    """))
    
    if result.scalar() == 0:
        print("=== Adding missing image_type column ===")
        op.add_column('prompts', sa.Column('image_type', sa.String(), nullable=True))
    
    result = connection.execute(sa.text("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'is_active'
    """))
    
    if result.scalar() == 0:
        print("=== Adding missing is_active column ===")
        op.add_column('prompts', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='false'))
    
    # Now let's try to populate the prompts table if it's empty
    result = connection.execute(sa.text("SELECT COUNT(*) FROM prompts"))
    if result.scalar() == 0:
        print("=== No prompts found, creating default prompts ===")
        
        # Insert the crisis map prompt
        op.execute("""
            INSERT INTO prompts (p_code, label, metadata_instructions, image_type, is_active) 
            VALUES (
                'DEFAULT_CRISIS_MAP',
                'Analyze this crisis map and provide a detailed description of the emergency situation, affected areas, and key information shown in the map.',
                'Additionally, extract the following metadata in JSON format. Choose exactly ONE option from each category:

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
}',
                'crisis_map',
                true
            )
        """)
        
        # Insert the drone image prompt
        op.execute("""
            INSERT INTO prompts (p_code, label, metadata_instructions, image_type, is_active) 
            VALUES (
                'DEFAULT_DRONE_IMAGE',
                'Analyze this drone image and provide an objective, concise description of what is visible (people, infrastructure, damage, hazards, access, context).',
                'Additionally, extract the following metadata in JSON format. All fields are optional - use null when unknown:

- title: concise title (<= 10 words)
- source: if applicable, choose from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER, otherwise null
- type: if applicable, choose from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION, otherwise null
- countries: if applicable, use ISO-2 codes (e.g., ["US","PA"]), otherwise null
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
}',
                'drone_image',
                false
            )
        """)
        
        print("=== Default prompts created ===")
    else:
        # Update existing prompts to have proper values
        print("=== Updating existing prompts ===")
        
        # Update the DEFAULT_CRISIS_MAP prompt
        op.execute("""
            UPDATE prompts 
            SET image_type = 'crisis_map', is_active = true 
            WHERE p_code = 'DEFAULT_CRISIS_MAP'
        """)
        
        # Update the DEFAULT_DRONE_IMAGE prompt if it exists
        op.execute("""
            UPDATE prompts 
            SET image_type = 'drone_image', is_active = false 
            WHERE p_code = 'DEFAULT_DRONE_IMAGE'
        """)
        
        # Set any other existing prompts to crisis_map type and inactive by default
        op.execute("""
            UPDATE prompts 
            SET image_type = 'crisis_map', is_active = false 
            WHERE image_type IS NULL
        """)
    
    # Now make the columns NOT NULL
    print("=== Making columns NOT NULL ===")
    op.alter_column('prompts', 'image_type', nullable=False)
    op.alter_column('prompts', 'is_active', nullable=False)
    
    # Add foreign key constraint if it doesn't exist
    result = connection.execute(sa.text("""
        SELECT COUNT(*) FROM information_schema.table_constraints 
        WHERE table_name = 'prompts' 
        AND constraint_name = 'prompts_image_type_fkey'
    """))
    
    if result.scalar() == 0:
        print("=== Adding foreign key constraint ===")
        op.create_foreign_key('prompts_image_type_fkey', 'prompts', 'image_types', ['image_type'], ['image_type'])
    
    print("=== Migration completed ===")

def downgrade():
    # This is a debug migration, no downgrade needed
    pass
