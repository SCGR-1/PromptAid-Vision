"""Add image_count to captions table

Revision ID: 0018
Revises: 0017
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add image_count column to captions table with default value of 1
    op.add_column('captions', sa.Column('image_count', sa.Integer(), nullable=True, server_default='1'))


def downgrade() -> None:
    # Remove image_count column from captions table
    op.drop_column('captions', 'image_count')
