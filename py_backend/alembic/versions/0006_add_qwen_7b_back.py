"""add qwen 7b model back

Revision ID: 0006_add_qwen_7b_back
Revises: 0005_hf_models_v2
Create Date: 2025-01-27 11:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0006_add_qwen_7b_back'
down_revision = '0005_hf_models_v2'
branch_labels = None
depends_on = None


def upgrade():
    # Add back the QWEN2_5_VL_7B model that was accidentally removed
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, config) VALUES
        ('QWEN2_5_VL_7B', 'Qwen2.5-VL-7B', 'custom', false, '{"provider":"huggingface","model_id":"Qwen/Qwen2.5-VL-7B-Instruct"}')
      ON CONFLICT (m_code) DO NOTHING
    """)


def downgrade():
    # Remove the QWEN2_5_VL_7B model
    op.execute("DELETE FROM models WHERE m_code = 'QWEN2_5_VL_7B'")
