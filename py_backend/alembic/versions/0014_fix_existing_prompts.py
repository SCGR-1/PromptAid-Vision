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
    # First, check if the columns exist and add them if they don't
    connection = op.get_bind()
    
    # Check if image_type column exists
    result = connection.execute(sa.text("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'image_type'
    """))
    
    if result.scalar() == 0:
        # Add image_type column
        op.add_column('prompts', sa.Column('image_type', sa.String(), nullable=True))
    
    # Check if is_active column exists
    result = connection.execute(sa.text("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'is_active'
    """))
    
    if result.scalar() == 0:
        # Add is_active column
        op.add_column('prompts', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='false'))
    
    # Now update existing prompts with proper values
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
    """)
    
    # Now make the columns NOT NULL
    op.alter_column('prompts', 'image_type', nullable=False)
    op.alter_column('prompts', 'is_active', nullable=False)
    
    # Add foreign key constraint if it doesn't exist
    result = connection.execute(sa.text("""
        SELECT COUNT(*) FROM information_schema.table_constraints 
        WHERE table_name = 'prompts' 
        AND constraint_name = 'prompts_image_type_fkey'
    """))
    
    if result.scalar() == 0:
        op.create_foreign_key('prompts_image_type_fkey', 'prompts', 'image_types', ['image_type'], ['image_type'])

def downgrade():
    # This is a data fix migration, no downgrade needed
    pass
