"""add thumbnail field to images table

Revision ID: 0019
Revises: 0018
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add thumbnail and detail columns to images table
    op.add_column('images', sa.Column('thumbnail_key', sa.String(), nullable=True))
    op.add_column('images', sa.Column('thumbnail_sha256', sa.String(), nullable=True))
    op.add_column('images', sa.Column('detail_key', sa.String(), nullable=True))
    op.add_column('images', sa.Column('detail_sha256', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove thumbnail and detail columns from images table
    op.drop_column('images', 'detail_sha256')
    op.drop_column('images', 'detail_key')
    op.drop_column('images', 'thumbnail_sha256')
    op.drop_column('images', 'thumbnail_key')
