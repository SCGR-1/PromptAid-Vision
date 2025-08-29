"""Add image_type and is_active to prompts table

Revision ID: 0011
Revises: 0010
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to prompts table
    op.add_column('prompts', sa.Column('image_type', sa.String(), nullable=True))
    op.add_column('prompts', sa.Column('is_active', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    
    # Update existing prompts to set image_type and is_active
    op.execute("""
        UPDATE prompts 
        SET image_type = 'crisis_map', is_active = true 
        WHERE p_code = 'DEFAULT_CRISIS_MAP'
    """)
    
    op.execute("""
        UPDATE prompts 
        SET image_type = 'drone_image', is_active = true 
        WHERE p_code = 'DEFAULT_DRONE_IMAGE'
    """)
    
    # Make image_type NOT NULL after setting values
    op.alter_column('prompts', 'image_type', nullable=False)
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_prompts_image_type', 
        'prompts', 
        'image_types', 
        ['image_type'], 
        ['image_type']
    )
    
    # Create index on image_type for performance
    op.create_index('ix_prompts_image_type', 'prompts', ['image_type'])

def downgrade():
    # Remove the index
    op.drop_index('ix_prompts_image_type', 'prompts')
    
    # Remove the foreign key constraint
    op.drop_constraint('fk_prompts_image_type', 'prompts', type_='foreignkey')
    
    # Remove the columns
    op.drop_column('prompts', 'is_active')
    op.drop_column('prompts', 'image_type')
