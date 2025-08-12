"""initial schema + full dynamic country seed (with json schemas & validation)

Revision ID: 0001_initial_schema_and_seed
Revises:
Create Date: 2025-08-01 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pycountry

revision = '0001_initial_schema_and_seed'
down_revision = None
branch_labels = None
depends_on = None


def _guess_region(alpha2: str) -> str:
    AFR = {'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI','DJ','EG',
           'GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML',
           'MR','MU','YT','MA','MZ','NA','NE','NG','RE','RW','SH','ST','SN','SC','SL','SO',
           'ZA','SS','SD','TZ','TG','TN','UG','EH','ZM','ZW'}
    AMR = {'US','CA','MX','BR','AR','CO','PE','VE','CL','EC','GT','CU','BO','DO','HT','HN',
           'PY','NI','SV','CR','PA','UY','JM','TT','GY','SR','BZ','KY','AG','BS','BB','BM',
           'DM','GD','GP','MQ','MS','PR','KN','LC','VC','SX','TC','VI'}
    EUR = {'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GI',
           'GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK',
           'NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB','VA'}
    MENA = {'DZ','BH','EG','IR','IQ','IL','JO','KW','LB','LY','MA','OM','QA','SA','SY','TN',
            'AE','YE','PS','SD','EH'}
    if alpha2 in MENA:
        return 'MENA'
    if alpha2 in (AFR - MENA):
        return 'AFR'
    if alpha2 in AMR:
        return 'AMR'
    if alpha2 in EUR:
        return 'EUR'
    return 'APA'


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto;')
    
    op.execute("DROP TABLE IF EXISTS captions CASCADE;")
    op.execute("DROP TABLE IF EXISTS image_countries CASCADE;")
    op.execute("DROP TABLE IF EXISTS images CASCADE;")
    op.execute("DROP TABLE IF EXISTS json_schemas CASCADE;")
    op.execute("DROP TABLE IF EXISTS models CASCADE;")
    op.execute("DROP TABLE IF EXISTS image_types CASCADE;")
    op.execute("DROP TABLE IF EXISTS spatial_references CASCADE;")
    op.execute("DROP TABLE IF EXISTS countries CASCADE;")
    op.execute("DROP TABLE IF EXISTS event_types CASCADE;")
    op.execute("DROP TABLE IF EXISTS regions CASCADE;")
    op.execute("DROP TABLE IF EXISTS sources CASCADE;")

    op.create_table(
        'sources',
        sa.Column('s_code', sa.String(), primary_key=True),
        sa.Column('label', sa.String(), nullable=False),
    )
    op.create_table(
        'regions',
        sa.Column('r_code', sa.String(), primary_key=True),
        sa.Column('label', sa.String(), nullable=False),
    )
    op.create_table(
        'event_types',
        sa.Column('t_code', sa.String(), primary_key=True),
        sa.Column('label', sa.String(), nullable=False),
    )
    op.create_table(
        'countries',
        sa.Column('c_code', sa.CHAR(length=2), primary_key=True),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('r_code', sa.String(), sa.ForeignKey('regions.r_code'), nullable=False),
    )
    op.create_table(
        'spatial_references',
        sa.Column('epsg', sa.String(), primary_key=True),
        sa.Column('srid', sa.String(), nullable=False),
        sa.Column('proj4', sa.String(), nullable=False),
        sa.Column('wkt', sa.String(), nullable=False),
    )
    op.create_table(
        'image_types',
        sa.Column('image_type', sa.String(), primary_key=True),
        sa.Column('label', sa.String(), nullable=False),
    )
    op.create_table(
        'models',
        sa.Column('m_code', sa.String(), primary_key=True),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('model_type', sa.String(), nullable=False),
        sa.Column('is_available', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_table(
        'json_schemas',
        sa.Column('schema_id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('schema', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('version', sa.String(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    op.execute("""
      INSERT INTO sources (s_code,label) VALUES
        ('PDC','PDC'),
        ('GDACS','GDACS'),
        ('WFP','WFP ADAM'),
        ('GFH','Google Flood Hub'),
        ('GGC','Google GenCast'),
        ('USGS','USGS'),
        ('OTHER','Other')
    """)
    op.execute("""
      INSERT INTO regions (r_code,label) VALUES
        ('AFR','Africa'),
        ('AMR','Americas'),
        ('APA','Asia-Pacific'),
        ('EUR','Europe'),
        ('MENA','Middle East & N Africa'),
        ('OTHER','Other')
    """)
    op.execute("""
      INSERT INTO event_types (t_code,label) VALUES
        ('BIOLOGICAL_EMERGENCY','Biological Emergency'),
        ('CHEMICAL_EMERGENCY','Chemical Emergency'),
        ('CIVIL_UNREST','Civil Unrest'),
        ('COLD_WAVE','Cold Wave'),
        ('COMPLEX_EMERGENCY','Complex Emergency'),
        ('CYCLONE','Cyclone'),
        ('DROUGHT','Drought'),
        ('EARTHQUAKE','Earthquake'),
        ('EPIDEMIC','Epidemic'),
        ('FIRE','Fire'),
        ('FLOOD','Flood'),
        ('FLOOD_INSECURITY','Flood Insecurity'),
        ('HEAT_WAVE','Heat Wave'),
        ('INSECT_INFESTATION','Insect Infestation'),
        ('LANDSLIDE','Landslide'),
        ('OTHER','Other'),
        ('PLUVIAL','Pluvial'),
        ('POPULATION_MOVEMENT','Population Movement'),
        ('RADIOLOGICAL_EMERGENCY','Radiological Emergency'),
        ('STORM','Storm'),
        ('TRANSPORTATION_EMERGENCY','Transportation Emergency'),
        ('TSUNAMI','Tsunami'),
        ('VOLCANIC_ERUPTION','Volcanic Eruption')
    """)
    op.execute("""
      INSERT INTO spatial_references (epsg, srid, proj4, wkt) VALUES
        ('4326','4326',
          '+proj=longlat +datum=WGS84 +no_defs',
          'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
        ),
        ('3857','3857',
          '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
          'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]]'
        ),
        ('32633','32633',
          '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs',
          'PROJCS["WGS 84 / UTM zone 33N",GEOGCS["WGS 84",DATUM["WGS 84",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
        ),
        ('32634','32634',
          '+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs',
          'PROJCS["WGS 84 / UTM zone 34N",GEOGCS["WGS 84",DATUM["WGS 84",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
        ),
        ('32617','32617',
          '+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs',
          'PROJCS["WGS 84 / UTM zone 17N",GEOGCS["WGS 84",DATUM["WGS 84",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-81],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1]]'
        ),
        ('OTHER','OTHER','','OTHER')
    """)
    op.execute("""
      INSERT INTO image_types (image_type,label) VALUES
        ('crisis_map','Crisis Map'),
        ('drone_image','Drone Image')
    """)
    op.execute("""
      INSERT INTO models (m_code,label,model_type,is_available,config) VALUES
        ('GPT-4O','GPT-4O','gpt4o',true,'{"provider":"openai","model":"gpt-4o"}'),
        ('GEMINI15','Gemini 1.5','gemini_pro_vision',true,'{}'),
        ('CLAUDE3','Claude 3','claude_3_5_sonnet',false,'{}'),
        ('STUB_MODEL','Stub Model','custom',true,'{"stub": true}'),
        ('LLAVA_1_5_7B','LLaVA 1.5 7B','custom',true,'{"provider":"huggingface","model_id":"llava-hf/llava-1.5-7b-hf"}'),
        ('BLIP2_OPT_2_7B','BLIP Image Captioning','custom',true,'{"provider":"huggingface","model_id":"Salesforce/blip-image-captioning-base"}'),
        ('VIT_GPT2','Vit gpt2 image captioning','custom',true,'{"provider":"huggingface","model_id":"nlpconnect/vit-gpt2-image-captioning"}')
    """)

    op.execute("""
      INSERT INTO json_schemas (schema_id,title,schema,version) VALUES
        ('default_caption@1.0.0','Default Caption Schema',
         '{"type":"object","properties":{"analysis":{"type":"string"},"metadata":{"type":"object","properties":{"title":{"type":"string"},"source":{"type":"string"},"type":{"type":"string"},"countries":{"type":"array","items":{"type":"string"}},"epsg":{"type":"string"}}}},"required":["analysis","metadata"]}',
         '1.0.0')
    """)

    for c in pycountry.countries:
        code = c.alpha_2
        name = c.name.replace("'", "''")
        region = _guess_region(code)
        op.execute(
            f"INSERT INTO countries (c_code,label,r_code) VALUES ('{code}','{name}','{region}')"
        )
    op.execute("INSERT INTO countries (c_code,label,r_code) VALUES ('XX','Not Applicable','OTHER')")

    op.create_table(
        'images',
        sa.Column('image_id', postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('file_key', sa.String(), nullable=False),
        sa.Column('sha256', sa.String(), nullable=False),
        sa.Column('source', sa.String(), sa.ForeignKey('sources.s_code'), nullable=False),
        sa.Column('event_type', sa.String(), sa.ForeignKey('event_types.t_code'), nullable=False),
        sa.Column('epsg', sa.String(), sa.ForeignKey('spatial_references.epsg'), nullable=False),
        sa.Column('image_type', sa.String(), sa.ForeignKey('image_types.image_type'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('captured_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_table(
        'image_countries',
        sa.Column('image_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('c_code', sa.CHAR(length=2), nullable=False),
        sa.PrimaryKeyConstraint('image_id', 'c_code', name='pk_image_countries'),
        sa.ForeignKeyConstraint(['image_id'], ['images.image_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['c_code'], ['countries.c_code'])
    )
    op.create_table(
        'captions',
        sa.Column('cap_id', postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('image_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('images.image_id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('prompt', sa.String(), nullable=False),
        sa.Column('model', sa.String(), sa.ForeignKey('models.m_code'), nullable=False),
        sa.Column('schema_id', sa.String(), sa.ForeignKey('json_schemas.schema_id'), nullable=False),
        sa.Column('raw_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('generated', sa.Text(), nullable=False),
        sa.Column('edited', sa.Text(), nullable=True),
        sa.Column('accuracy', sa.SmallInteger()),
        sa.Column('context', sa.SmallInteger()),
        sa.Column('usability', sa.SmallInteger()),
        sa.Column('starred', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint('accuracy  IS NULL OR (accuracy  BETWEEN 0 AND 100)', name='chk_captions_accuracy'),
        sa.CheckConstraint('context   IS NULL OR (context   BETWEEN 0 AND 100)', name='chk_captions_context'),
        sa.CheckConstraint('usability IS NULL OR (usability BETWEEN 0 AND 100)', name='chk_captions_usability')
    )

    op.create_index('ix_images_created_at', 'images', ['created_at'])
    op.create_index('ix_captions_created_at', 'captions', ['created_at'])
    op.create_index('ix_captions_image_id', 'captions', ['image_id'])


def downgrade():
    op.drop_index('ix_captions_image_id', table_name='captions')
    op.drop_index('ix_captions_created_at', table_name='captions')
    op.drop_index('ix_images_created_at', table_name='images')
    op.drop_table('captions')
    op.drop_table('image_countries')
    op.drop_table('images')
    op.drop_table('json_schemas')
    op.drop_table('models')
    op.drop_table('image_types')
    op.drop_table('spatial_references')
    op.drop_table('countries')
    op.drop_table('event_types')
    op.drop_table('regions')
    op.drop_table('sources')
