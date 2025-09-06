"""add_image_type_to_json_schemas

Revision ID: 0021
Revises: 0020_add_is_fallback_to_models
Create Date: 2024-12-19 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0021'
down_revision = '0020_add_is_fallback_to_models'
branch_labels = None
depends_on = None


def upgrade():
    # Add image_type column to json_schemas table
    op.add_column('json_schemas', sa.Column('image_type', sa.String(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key('fk_json_schemas_image_type', 'json_schemas', 'image_types', ['image_type'], ['image_type'])
    
    # Update existing schemas to link them to image types
    # default_caption@1.0.0 -> crisis_map
    op.execute("UPDATE json_schemas SET image_type = 'crisis_map' WHERE schema_id = 'default_caption@1.0.0'")
    
    # drone_caption@1.0.0 -> drone
    op.execute("UPDATE json_schemas SET image_type = 'drone' WHERE schema_id = 'drone_caption@1.0.0'")


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_json_schemas_image_type', 'json_schemas', type_='foreignkey')
    
    # Remove image_type column
    op.drop_column('json_schemas', 'image_type')
