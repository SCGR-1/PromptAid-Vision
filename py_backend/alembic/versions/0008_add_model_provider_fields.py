"""add provider and model_id columns to models table

Revision ID: 0008_add_model_provider_fields
Revises: 0007_fix_model_availability
Create Date: 2025-01-27 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0008_add_model_provider_fields'
down_revision = '0007_fix_model_availability'
branch_labels = None
depends_on = None


def upgrade():
    # Add provider and model_id columns
    op.add_column('models', sa.Column('provider', sa.String(), nullable=True))
    op.add_column('models', sa.Column('model_id', sa.String(), nullable=True))
    
    # Populate the new columns from existing config data
    op.execute("""
        UPDATE models 
        SET provider = config->>'provider',
            model_id = config->>'model_id'
        WHERE config IS NOT NULL 
        AND config->>'provider' IS NOT NULL
    """)
    
    # Set default values for models without config
    op.execute("""
        UPDATE models 
        SET provider = 'huggingface', 
            model_id = m_code
        WHERE provider IS NULL OR model_id IS NULL
    """)


def downgrade():
    # Remove the added columns
    op.drop_column('models', 'model_id')
    op.drop_column('models', 'provider')
