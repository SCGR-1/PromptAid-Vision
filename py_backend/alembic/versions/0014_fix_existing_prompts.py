"""Fix existing prompts by adding missing image_type and is_active fields

Revision ID: 0014
Revises: 0012
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0014'
down_revision = '0012'
branch_labels = None
depends_on = None

def upgrade():
    # Update existing prompts to have proper image_type and is_active fields
    # First, update the DEFAULT_CRISIS_MAP prompt
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
    "")

def downgrade():
    # This is a data fix migration, no downgrade needed
    pass
