"""update huggingface models and set is_available to false by default

Revision ID: 0004_update_huggingface_models
Revises: 0003_fix_json_schemas
Create Date: 2025-01-27 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0004_update_huggingface_models'
down_revision = '0003_fix_json_schemas'
branch_labels = None
depends_on = None


def upgrade():
    # First, set all existing models to is_available = false
    op.execute("UPDATE models SET is_available = false")
    
    # Remove old HuggingFace models that don't exist anymore
    op.execute("DELETE FROM models WHERE m_code IN ('LLAVA_1_5_7B', 'BLIP2_OPT_2_7B', 'VIT_GPT2')")
    
    # Insert new HuggingFace models with is_available = false
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, config) VALUES
        ('QWEN2_5_VL_7B', 'Qwen2.5-VL-7B', 'custom', false, '{"provider":"huggingface","model_id":"Qwen/Qwen2.5-VL-7B-Instruct"}'),
        ('MINICPM_V_2_6', 'MiniCPM-V-2.6', 'custom', false, '{"provider":"huggingface","model_id":"OpenBMB/MiniCPM-V-2_6"}'),
        ('IDEFICS2_8B', 'Idefics2-8B', 'custom', false, '{"provider":"huggingface","model_id":"HuggingFaceM4/idefics2-8b-chatty"}'),
        ('INTERNVL2_8B', 'InternVL2-8B', 'custom', false, '{"provider":"huggingface","model_id":"OpenGVLab/InternVL2-8B"}'),
        ('YI_VL_34B', 'Yi-VL-34B', 'custom', false, '{"provider":"huggingface","model_id":"01-ai/Yi-VL-34B"}')
    """)
    
    # Keep existing non-HuggingFace models but set them to false
    # GPT-4O, GEMINI15, CLAUDE3, STUB_MODEL will remain but with is_available = false


def downgrade():
    # Remove new HuggingFace models
    op.execute("DELETE FROM models WHERE m_code IN ('QWEN2_5_VL_7B', 'MINICPM_V_2_6', 'IDEFICS2_8B', 'INTERNVL2_8B', 'YI_VL_34B')")
    
    # Restore old models
    op.execute("""
      INSERT INTO models (m_code, label, model_type, is_available, config) VALUES
        ('LLAVA_1_5_7B', 'LLaVA 1.5 7B', 'custom', true, '{"provider":"huggingface","model_id":"llava-hf/llava-1.5-7b-hf"}'),
        ('BLIP2_OPT_2_7B', 'BLIP Image Captioning', 'custom', true, '{"provider":"huggingface","model_id":"Salesforce/blip-image-captioning-base"}'),
        ('VIT_GPT2', 'Vit gpt2 image captioning', 'custom', true, '{"provider":"huggingface","model_id":"nlpconnect/vit-gpt2-image-captioning"}')
    """)
    
    # Set all models back to available
    op.execute("UPDATE models SET is_available = true")
