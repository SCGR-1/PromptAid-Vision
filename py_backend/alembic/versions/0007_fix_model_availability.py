"""fix model availability and add missing qwen 32b model

Revision ID: 0007_fix_model_availability
Revises: 0006_add_qwen_7b_back
Create Date: 2025-01-27 11:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0007_fix_model_availability'
down_revision = '0006_add_qwen_7b_back'
branch_labels = None
depends_on = None


def upgrade():
    # Set all models to is_available = false by default
    op.execute("UPDATE models SET is_available = false")
    
    # Add the missing QWEN2_5_VL_32B model
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, config) VALUES
        ('QWEN2_5_VL_32B', 'Qwen2.5-VL-32B', 'custom', false, '{"provider":"huggingface","model_id":"Qwen/Qwen2.5-VL-32B-Instruct"}')
      ON CONFLICT (m_code) DO NOTHING
    """)


def downgrade():
    # Set all models back to available
    op.execute("UPDATE models SET is_available = true")
    
    # Remove the QWEN2_5_VL_32B model
    op.execute("DELETE FROM models WHERE m_code = 'QWEN2_5_VL_32B'")
