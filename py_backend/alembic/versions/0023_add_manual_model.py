"""add_manual_model

Revision ID: 0023
Revises: 0022
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0023'
down_revision = '0022'
branch_labels = None
depends_on = None


def upgrade():
    # Insert the manual model with is_available = true, other nullable fields as NULL
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, is_fallback, delete_count, config, provider, model_id) 
      VALUES ('manual', 'Manual', 'manual', true, false, 0, NULL, NULL, NULL)
      ON CONFLICT (m_code) DO NOTHING
    """)


def downgrade():
    # Remove the manual model
    op.execute("DELETE FROM models WHERE m_code = 'manual'")

