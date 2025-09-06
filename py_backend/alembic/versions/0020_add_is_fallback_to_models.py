"""add_is_fallback_to_models

Revision ID: 0020_add_is_fallback_to_models
Revises: 0019_add_image_count_to_captions
Create Date: 2025-01-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0020_add_is_fallback_to_models'
down_revision = '0019_add_image_count_to_captions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_fallback column to models table
    op.add_column('models', sa.Column('is_fallback', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add check constraint to ensure fallback model must be available
    op.create_check_constraint(
        'fallback_must_be_available',
        'models',
        'NOT (is_fallback = true AND is_available = false)'
    )


def downgrade() -> None:
    # Remove check constraint
    op.drop_constraint('fallback_must_be_available', 'models', type_='check')
    
    # Remove is_fallback column
    op.drop_column('models', 'is_fallback')
