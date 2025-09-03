"""Add UNKNOWN values to lookup tables

Revision ID: 0017
Revises: 0016
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None

def upgrade():
    # Add UNKNOWN value to sources table
    op.execute("""
      INSERT INTO sources (s_code, label) VALUES ('UNKNOWN', 'Unknown')
      ON CONFLICT (s_code) DO NOTHING
    """)
    
    # Add UNKNOWN value to event_types table
    op.execute("""
      INSERT INTO event_types (t_code, label) VALUES ('UNKNOWN', 'Unknown')
      ON CONFLICT (t_code) DO NOTHING
    """)
    
    # Add UNKNOWN value to spatial_references table
    op.execute("""
      INSERT INTO spatial_references (epsg, srid, proj4, wkt) VALUES ('UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN')
      ON CONFLICT (epsg) DO NOTHING
    """)

def downgrade():
    # Remove UNKNOWN values from lookup tables
    op.execute("DELETE FROM sources WHERE s_code = 'UNKNOWN'")
    op.execute("DELETE FROM event_types WHERE t_code = 'UNKNOWN'")
    op.execute("DELETE FROM spatial_references WHERE epsg = 'UNKNOWN'")
