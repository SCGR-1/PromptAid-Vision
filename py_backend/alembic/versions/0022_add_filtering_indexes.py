"""add_filtering_indexes

Revision ID: 0022
Revises: 0021
Create Date: 2024-12-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0022'
down_revision = '0021'
branch_labels = None
depends_on = None


def upgrade():
    # Indexes for images table - commonly filtered columns
    # Note: ix_images_captured_at already exists from migration 0016, skip it here
    op.execute("CREATE INDEX IF NOT EXISTS ix_images_source ON images(source)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_images_event_type ON images(event_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_images_image_type ON images(image_type)")
    
    # Indexes for captions table - filtered and ordered columns
    op.execute("CREATE INDEX IF NOT EXISTS ix_captions_starred ON captions(starred)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_captions_created_at ON captions(created_at)")
    
    # Indexes for join tables - improve join performance
    op.execute("CREATE INDEX IF NOT EXISTS ix_image_countries_image_id ON image_countries(image_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_image_countries_c_code ON image_countries(c_code)")
    
    # Index on Country.r_code for region filtering
    op.execute("CREATE INDEX IF NOT EXISTS ix_countries_r_code ON countries(r_code)")


def downgrade():
    op.drop_index('ix_countries_r_code', table_name='countries', if_exists=True)
    op.drop_index('ix_image_countries_c_code', table_name='image_countries', if_exists=True)
    op.drop_index('ix_image_countries_image_id', table_name='image_countries', if_exists=True)
    op.drop_index('ix_captions_created_at', table_name='captions', if_exists=True)
    op.drop_index('ix_captions_starred', table_name='captions', if_exists=True)
    op.drop_index('ix_images_image_type', table_name='images', if_exists=True)
    op.drop_index('ix_images_event_type', table_name='images', if_exists=True)
    op.drop_index('ix_images_source', table_name='images', if_exists=True)

