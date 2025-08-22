"""update huggingface models v2 - keep qwen 7b and replace others with new models

Revision ID: 0005_update_huggingface_models_v2
Revises: 0004_update_huggingface_models
Create Date: 2025-01-27 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0005_hf_models_v2'
down_revision = '0004_update_huggingface_models'
branch_labels = None
depends_on = None


def upgrade():
    # Remove the old models that are no longer supported
    op.execute("DELETE FROM models WHERE m_code IN ('MINICPM_V_2_6', 'IDEFICS2_8B', 'INTERNVL2_8B', 'YI_VL_34B')")
    
    # Insert new HuggingFace models with is_available = false
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, config) VALUES
        ('QWEN2_5_VL_32B', 'Qwen2.5-VL-32B', 'custom', false, '{"provider":"huggingface","model_id":"Qwen/Qwen2.5-VL-32B-Instruct"}'),
        ('QWEN2_5_VL_72B', 'Qwen2.5-VL-72B', 'custom', false, '{"provider":"huggingface","model_id":"Qwen/Qwen2.5-VL-72B-Instruct"}'),
        ('GLM_4_5V', 'GLM-4.5V', 'custom', false, '{"provider":"huggingface","model_id":"zai-org/GLM-4.5V"}'),
        ('GLM_4_1V_9B_THINKING', 'GLM-4.1V-9B-Thinking', 'custom', false, '{"provider":"huggingface","model_id":"zai-org/GLM-4.1V-9B-Thinking"}'),
        ('COMMAND_A_VISION_07_2025', 'Command-A-Vision-07-2025', 'custom', false, '{"provider":"huggingface","model_id":"CohereLabs/command-a-vision-07-2025"}')
    """)
    
    # Keep QWEN2_5_VL_7B as is (it's working perfectly)
    # All models remain with is_available = false by default


def downgrade():
    # Remove new models
    op.execute("DELETE FROM models WHERE m_code IN ('QWEN2_5_VL_32B', 'QWEN2_5_VL_72B', 'GLM_4_5V', 'GLM_4_1V_9B_THINKING', 'COMMAND_A_VISION_07_2025')")
    
    # Restore old models
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, config) VALUES
        ('MINICPM_V_2_6', 'MiniCPM-V-2.6', 'custom', false, '{"provider":"huggingface","model_id":"OpenBMB/MiniCPM-V-2_6"}'),
        ('IDEFICS2_8B', 'Idefics2-8B', 'custom', false, '{"provider":"huggingface","model_id":"HuggingFaceM4/idefics2-8b-chatty"}'),
        ('INTERNVL2_8B', 'InternVL2-8B', 'custom', false, '{"provider":"huggingface","model_id":"OpenGVLab/InternVL2-8B"}'),
        ('YI_VL_34B', 'Yi-VL-34B', 'custom', false, '{"provider":"huggingface","model_id":"01-ai/Yi-VL-34B"}')
    """)
