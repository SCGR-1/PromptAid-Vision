# py_backend/alembic/versions/0002_seed_lookups.py

"""seed lookup tables

Revision ID: 0002seed
Revises: ad38fd571716
Create Date: 2025-07-25 14:00:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '0002seed'
down_revision = 'ad38fd571716'
branch_labels = None
depends_on = None


def upgrade():
    # 1) sources
    op.execute("""
      INSERT INTO sources (s_code, label) VALUES
        ('WFP_ADAM',    'WFP ADAM – Automated Disaster Analysis & Mapping'),
        ('PDC',         'Pacific Disaster Center (PDC)'),
        ('GDACS',       'GDACS – Global Disaster Alert & Coordination System'),
        ('GFL_HUB',     'Google Flood Hub'),
        ('GFL_GENCAST', 'Google GenCast'),
        ('USGS',        'USGS – United States Geological Survey'),
        ('_TBD_SOURCE','TBD placeholder')
      ON CONFLICT (s_code) DO NOTHING;
    """)

    # 2) region
    op.execute("""
      INSERT INTO region (r_code, label) VALUES
        ('AFR','Africa'),
        ('AMR','Americas'),
        ('APA','Asia‑Pacific'),
        ('EUR','Europe'),
        ('MENA','Middle East & North Africa'),
        ('_TBD_REGION','TBD placeholder')
      ON CONFLICT (r_code) DO NOTHING;
    """)

    # 3) category
    op.execute("""
      INSERT INTO category (cat_code, label) VALUES
        ('FLOOD','Flood'),
        ('WILDFIRE','Wildfire'),
        ('EARTHQUAKE','Earthquake'),
        ('CYCLONE','Cyclone'),
        ('DROUGHT','Drought'),
        ('LANDSLIDE','Landslide'),
        ('TORNADO','Tornado'),
        ('VOLCANO','Volcano'),
        ('OTHER','Other'),
        ('_TBD_CATEGORY','TBD placeholder')
      ON CONFLICT (cat_code) DO NOTHING;
    """)

    # 4) model
    op.execute("""
      INSERT INTO model (m_code, label) VALUES
        ('GPT-4O',   'GPT‑4o Vision'),
        ('GEMINI15', 'Gemini 1.5 Pro'),
        ('CLAUDE3',  'Claude 3 Sonnet'),
        ('STUB_MODEL','Stub Captioner')
      ON CONFLICT (m_code) DO NOTHING;
    """)

    # 5) country (example set; add more ISO‑2 codes as needed)
    op.execute("""
      INSERT INTO country (c_code, label) VALUES
        ('PH','Philippines'),
        ('ID','Indonesia'),
        ('VN','Vietnam')
      ON CONFLICT (c_code) DO NOTHING;
    """)


def downgrade():
    # reverse in roughly the opposite order
    op.execute("DELETE FROM country WHERE c_code IN ('PH','ID','VN');")
    op.execute("DELETE FROM model WHERE m_code IN ('GPT-4O','GEMINI15','CLAUDE3','STUB_MODEL');")
    op.execute("DELETE FROM category WHERE cat_code IN ('FLOOD','WILDFIRE','EARTHQUAKE','CYCLONE','DROUGHT','LANDSLIDE','TORNADO','VOLCANO','OTHER','_TBD_CATEGORY');")
    op.execute("DELETE FROM region   WHERE r_code    IN ('AFR','AMR','APA','EUR','MENA','_TBD_REGION');")
    op.execute("DELETE FROM sources  WHERE s_code   IN ('WFP_ADAM','PDC','GDACS','GFL_HUB','GFL_GENCAST','USGS','_TBD_SOURCE');")
