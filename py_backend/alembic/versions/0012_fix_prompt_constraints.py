"""Fix prompt constraints to allow multiple inactive prompts per image type

Revision ID: 0012
Revises: 0011
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None

def upgrade():
    # Drop the incorrect unique constraint
    op.drop_constraint('uq_prompts_image_type_active', 'prompts', type_='unique')
    
    # Create a partial unique constraint that only applies when is_active = true
    # This allows multiple inactive prompts per image type, but only one active
    op.execute("""
        CREATE UNIQUE INDEX uq_prompts_active_per_type 
        ON prompts (image_type) 
        WHERE is_active = true
    """)

def downgrade():
    # Drop the partial unique constraint
    op.execute("DROP INDEX IF EXISTS uq_prompts_active_per_type")
    
    # Recreate the original constraint
    op.create_unique_constraint('uq_prompts_image_type_active', 'prompts', ['image_type', 'is_active'])
