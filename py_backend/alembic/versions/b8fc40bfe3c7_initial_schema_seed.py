"""initial schema + full dynamic country seed

Revision ID: 0001_initial_schema_and_seed
Revises: 
Create Date: 2025-08-01 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pycountry

# revision identifiers, used by Alembic.
revision = '0001_initial_schema_and_seed'
down_revision = None
branch_labels = None
depends_on = None

def _guess_region(alpha2: str) -> str:
    # Rough continent→region buckets; tweak as needed
    AFR = {'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI','DJ','EG',
           'GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML',
           'MR','MU','YT','MA','MZ','NA','NE','NG','RE','RW','SH','ST','SN','SC','SL','SO',
           'ZA','SS','SD','TZ','TG','TN','UG','EH','ZM','ZW'}
    AMR = {'US','CA','MX','BR','AR','CO','PE','VE','CL','EC','GT','CU','BO','DO','HT','HN',
           'PY','NI','SV','CR','PA','UY','JM','TT','GY','SR','BZ','KY','AG','BS','BB','BM',
           'DM','GD','GP','HT','MQ','MS','PR','KN','LC','VC','SX','TC','VI'}
    EUR = {'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GI',
           'GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK',
           'NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB','VA'}
    MENA = {'DZ','BH','EG','IR','IQ','IL','JO','KW','LB','LY','MA','OM','QA','SA','SY','TN',
            'AE','YE','PS','SD','EH'}
    # If it’s in MENA, call it MENA; else AFR-only if in AFR set; else AMR, EUR, else APA
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
    # allow uuid generation
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto;')

    #
    # 1) lookup tables
    #
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
        'types',
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
    )

    #
    # 2) seed lookup tables
    #
    # — sources —
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
    # — region —
    op.execute("""
      INSERT INTO regions (r_code,label) VALUES
        ('AFR','Africa'),
        ('AMR','Americas'),
        ('APA','Asia-Pacific'),
        ('EUR','Europe'),
        ('MENA','Middle East & N Africa')
    """)
    # — Type —
    op.execute("""
      INSERT INTO types (t_code,label) VALUES
        ('FLOOD','Flood'),
        ('FIRE','Fire'),
        ('EARTHQUAKE','Earthquake'),
        ('CYCLONE','Cyclone'),
        ('TSUNAMI','Tsunami'),
        ('POPULATION_MOVEMENT','Population Movement'),
        ('EPIDEMIC','Epidemic'),
        ('PLUVIAL','Pluvial'),
        ('STORM','Storm'),
        ('LANDSLIDE','Landslide'),
        ('COLD_WAVE','Cold Wave'),
        ('BIOLOGICAL_EMERGENCY','Biological Emergency'),
        ('CHEMICAL_EMERGENCY','Chemical Emergency'),
        ('CIVIL_UNREST','Civil Unrest'),
        ('COMPLEX_EMERGENCY','Complex Emergency'),
        ('DROUGHT','Drought'),
        ('FLOOD_INSECURITY','Flood Insecurity'),
        ('HEAT_WAVE','Heat Wave'),
        ('INSECT_INFESTATION','Insect Infestation'),
        ('RADIOLOGICAL_EMERGENCY','Radiological Emergency'),
        ('TRANSPORTATION_EMERGENCY','Transportation Emergency'),
        ('VOLCANIC_ERUPTION','Volcanic Eruption'),
        ('OTHER','Other')
    """)

    # seed only the most common CRSs + an “Other” placeholder
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
          'PROJCS["WGS 84 / UTM zone 33N",GEOGCS["WGS 84",…]]'
        ),
        ('32634','32634',
          '+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs',
          'PROJCS["WGS 84 / UTM zone 34N",GEOGCS["WGS 84",…]]'
        ),
        ('OTHER','OTHER',
          '',
          'Other'
        );
    """)
    # — image_type —
    op.execute("""
      INSERT INTO image_types (image_type,label) VALUES
        ('crisis_map','Crisis Map'),
        ('drone_image','Drone Image')
    """)
    # — model —
    op.execute("""
      INSERT INTO models (m_code,label) VALUES
        ('GPT-4O','GPT-4O'),
        ('GEMINI15','Gemini 1.5'),
        ('CLAUDE3','Claude 3'),
        ('STUB_MODEL','<stub>')
    """)

    # — country: full ISO-3166 seed via pycountry + auto region guess —
    for c in pycountry.countries:
        code = c.alpha_2
        name = c.name.replace("'", "''")
        region = _guess_region(code)
        op.execute(
            f"INSERT INTO countries (c_code,label,r_code) "
            f"VALUES ('{code}','{name}','{region}')"
        )

    #
    # 3) core tables
    #
    op.create_table(
        'images',
        sa.Column('image_id', postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('file_key', sa.String(), nullable=False),
        sa.Column('sha256', sa.String(), nullable=False),
        sa.Column('source', sa.String(), sa.ForeignKey('sources.s_code'), nullable=False),
        sa.Column('type', sa.String(), sa.ForeignKey('types.t_code'), nullable=False),
        sa.Column('epsg', sa.String(), sa.ForeignKey('spatial_references.epsg'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('image_type', sa.String(), sa.ForeignKey('image_types.image_type'), nullable=False),
    )
    op.create_table(
        'image_countries',
        sa.Column('image_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('c_code', sa.CHAR(length=2), nullable=False),
        sa.PrimaryKeyConstraint('image_id','c_code'),
        sa.ForeignKeyConstraint(['image_id'], ['images.image_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['c_code'], ['countries.c_code']),
    )
    op.create_table(
        'captions',
        sa.Column('cap_id', postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('image_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('images.image_id', ondelete='CASCADE'),
                  unique=True, nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('prompt', sa.String(), nullable=False),
        sa.Column('model', sa.String(), sa.ForeignKey('models.m_code'), nullable=False),
        sa.Column('raw_json', sa.JSON(), nullable=False),
        sa.Column('generated', sa.String(), nullable=False),
        sa.Column('edited', sa.String(), nullable=True),
        sa.Column('accuracy', sa.SmallInteger()),
        sa.Column('context', sa.SmallInteger()),
        sa.Column('usability', sa.SmallInteger()),
        sa.Column('starred', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('captions')
    op.drop_table('image_countries')
    op.drop_table('images')
    op.drop_table('models')
    op.drop_table('image_types')
    op.drop_table('spatial_references')
    op.drop_table('countries')
    op.drop_table('types')
    op.drop_table('regions')
    op.drop_table('sources')
