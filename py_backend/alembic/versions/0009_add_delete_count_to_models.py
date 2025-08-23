"""add delete_count column to models table

Revision ID: 0009_add_delete_count_to_models
Revises: 0008_add_model_provider_fields
Create Date: 2025-01-27 13:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0009_add_delete_count_to_models'
down_revision = '0008_add_model_provider_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add delete_count column with default value 0
    op.add_column('models', sa.Column('delete_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    # Remove the added column
    op.drop_column('models', 'delete_count')
