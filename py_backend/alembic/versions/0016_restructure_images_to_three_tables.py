"""Restructure images table into three tables: Images, Captions, and Images_captions

Revision ID: 0016
Revises: 0015
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None

def upgrade():
    # Ensure pgcrypto extension is available
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto;')
    
    # First, ensure the old images table has all the caption columns
    # (in case they were removed by a previous partial migration)
    connection = op.get_bind()
    
    # Check if caption columns exist and add them if they don't
    caption_columns = [
        ('title', 'VARCHAR'),
        ('prompt', 'VARCHAR'),
        ('model', 'VARCHAR'),
        ('schema_id', 'VARCHAR'),
        ('raw_json', 'JSONB'),
        ('generated', 'TEXT'),
        ('edited', 'TEXT'),
        ('accuracy', 'SMALLINT'),
        ('context', 'SMALLINT'),
        ('usability', 'SMALLINT'),
        ('starred', 'BOOLEAN'),
        ('updated_at', 'TIMESTAMP WITH TIME ZONE'),
        ('created_at', 'TIMESTAMP WITH TIME ZONE')
    ]
    
    for col_name, col_type in caption_columns:
        result = connection.execute(sa.text(f"""
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'images' AND column_name = '{col_name}'
        """))
        if result.scalar() == 0:
            if col_type == 'BOOLEAN':
                op.add_column('images', sa.Column(col_name, sa.Boolean(), nullable=True, server_default='false'))
            elif col_type == 'TIMESTAMP WITH TIME ZONE':
                op.add_column('images', sa.Column(col_name, sa.TIMESTAMP(timezone=True), nullable=True))
            else:
                op.add_column('images', sa.Column(col_name, sa.String() if col_type == 'VARCHAR' else sa.Text() if col_type == 'TEXT' else sa.SmallInteger(), nullable=True))
    
    # Create new Images table with temporary caption_id column for mapping
    op.create_table(
        'images_new',
        sa.Column('image_id', postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('file_key', sa.String(), nullable=False),
        sa.Column('sha256', sa.String(), nullable=False),
        sa.Column('source', sa.String(), sa.ForeignKey('sources.s_code'), nullable=True),
        sa.Column('event_type', sa.String(), sa.ForeignKey('event_types.t_code'), nullable=False),
        sa.Column('epsg', sa.String(), sa.ForeignKey('spatial_references.epsg'), nullable=False),
        sa.Column('image_type', sa.String(), sa.ForeignKey('image_types.image_type'), nullable=False),
        sa.Column('captured_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('center_lon', sa.Float(precision=53), nullable=True),
        sa.Column('center_lat', sa.Float(precision=53), nullable=True),
        sa.Column('amsl_m', sa.Float(precision=53), nullable=True),
        sa.Column('agl_m', sa.Float(precision=53), nullable=True),
        sa.Column('heading_deg', sa.Float(precision=53), nullable=True),
        sa.Column('yaw_deg', sa.Float(precision=53), nullable=True),
        sa.Column('pitch_deg', sa.Float(precision=53), nullable=True),
        sa.Column('roll_deg', sa.Float(precision=53), nullable=True),
        sa.Column('rtk_fix', sa.Boolean(), nullable=True),
        sa.Column('std_h_m', sa.Float(precision=53), nullable=True),
        sa.Column('std_v_m', sa.Float(precision=53), nullable=True),
        sa.Column('temp_caption_id', postgresql.UUID(as_uuid=True), nullable=True),
        
        sa.CheckConstraint('center_lat IS NULL OR (center_lat BETWEEN -90 AND 90)', name='chk_images_new_center_lat'),
        sa.CheckConstraint('center_lon IS NULL OR (center_lon BETWEEN -180 AND 180)', name='chk_images_new_center_lon'),
        sa.CheckConstraint('heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg <= 360)', name='chk_images_new_heading_deg'),
        sa.CheckConstraint('pitch_deg IS NULL OR (pitch_deg BETWEEN -90 AND 90)', name='chk_images_new_pitch_deg'),
        sa.CheckConstraint('yaw_deg IS NULL OR (yaw_deg BETWEEN -180 AND 180)', name='chk_images_new_yaw_deg'),
        sa.CheckConstraint('roll_deg IS NULL OR (roll_deg BETWEEN -180 AND 180)', name='chk_images_new_roll_deg'),
    )

    # Create new Captions table
    op.create_table(
        'captions',
        sa.Column('caption_id', postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('prompt', sa.String(), sa.ForeignKey('prompts.p_code'), nullable=True),
        sa.Column('model', sa.String(), sa.ForeignKey('models.m_code'), nullable=True),
        sa.Column('schema_id', sa.String(), sa.ForeignKey('json_schemas.schema_id'), nullable=True),
        sa.Column('raw_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated', sa.Text(), nullable=True),
        sa.Column('edited', sa.Text(), nullable=True),
        sa.Column('accuracy', sa.SmallInteger()),
        sa.Column('context', sa.SmallInteger()),
        sa.Column('usability', sa.SmallInteger()),
        sa.Column('starred', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        
        sa.CheckConstraint('accuracy IS NULL OR (accuracy BETWEEN 0 AND 100)', name='chk_captions_accuracy'),
        sa.CheckConstraint('context IS NULL OR (context BETWEEN 0 AND 100)', name='chk_captions_context'),
        sa.CheckConstraint('usability IS NULL OR (usability BETWEEN 0 AND 100)', name='chk_captions_usability')
    )

    # Create Images_captions junction table
    op.create_table(
        'images_captions',
        sa.Column('image_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('caption_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint('image_id', 'caption_id', name='pk_images_captions'),
        sa.ForeignKeyConstraint(['image_id'], ['images_new.image_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['caption_id'], ['captions.caption_id'], ondelete='CASCADE')
    )

    # Add indexes for performance
    op.create_index('ix_images_captions_image_id', 'images_captions', ['image_id'])
    op.create_index('ix_images_captions_caption_id', 'images_captions', ['caption_id'])

    # Migrate data from old images table to new structure with temporary caption_id
    op.execute("""
        INSERT INTO images_new (
            image_id, file_key, sha256, source, event_type, epsg, image_type, captured_at,
            center_lon, center_lat, amsl_m, agl_m, heading_deg, yaw_deg, pitch_deg, roll_deg, rtk_fix, std_h_m, std_v_m,
            temp_caption_id
        )
        SELECT 
            image_id, file_key, sha256, source, event_type, epsg, image_type, captured_at,
            center_lon, center_lat, amsl_m, agl_m, heading_deg, yaw_deg, pitch_deg, roll_deg, rtk_fix, std_h_m, std_v_m,
            CASE 
                WHEN title IS NOT NULL OR prompt IS NOT NULL OR model IS NOT NULL OR schema_id IS NOT NULL
                     OR raw_json IS NOT NULL OR generated IS NOT NULL OR edited IS NOT NULL
                     OR accuracy IS NOT NULL OR context IS NOT NULL OR usability IS NOT NULL
                     OR starred = true OR updated_at IS NOT NULL
                THEN gen_random_uuid()
                ELSE NULL
            END as temp_caption_id
        FROM images
    """)

    # Migrate caption data using the same temp_caption_id
    op.execute("""
        INSERT INTO captions (
            caption_id, title, prompt, model, schema_id, raw_json, generated, edited,
            accuracy, context, usability, starred, created_at, updated_at
        )
        SELECT 
            i_new.temp_caption_id, i.title, i.prompt, i.model, i.schema_id, i.raw_json, i.generated, i.edited,
            i.accuracy, i.context, i.usability, i.starred, i.created_at, i.updated_at
        FROM images i
        JOIN images_new i_new ON i.image_id = i_new.image_id
        WHERE i_new.temp_caption_id IS NOT NULL
    """)

    # Create relationships using the temp_caption_id
    op.execute("""
        INSERT INTO images_captions (image_id, caption_id)
        SELECT image_id, temp_caption_id
        FROM images_new
        WHERE temp_caption_id IS NOT NULL
    """)

    # Drop the temporary column
    op.drop_column('images_new', 'temp_caption_id')

    # Save image_countries data to temp table before dropping
    op.execute("CREATE TEMP TABLE tmp_image_countries AS TABLE image_countries")
    
    # Drop old tables and constraints
    op.drop_table('image_countries')
    op.drop_index('ix_images_created_at', table_name='images', if_exists=True)
    op.drop_table('images')

    # Rename new table to 'images'
    op.rename_table('images_new', 'images')

    # Recreate image_countries table with new image_id reference
    op.create_table(
        'image_countries',
        sa.Column('image_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('c_code', sa.CHAR(length=2), nullable=False),
        sa.PrimaryKeyConstraint('image_id', 'c_code', name='pk_image_countries'),
        sa.ForeignKeyConstraint(['image_id'], ['images.image_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['c_code'], ['countries.c_code'])
    )

    # Restore image_countries data
    op.execute("""
        INSERT INTO image_countries (image_id, c_code)
        SELECT image_id, c_code FROM tmp_image_countries
    """)

    # Recreate index with proper name
    op.create_index('ix_images_captured_at', 'images', ['captured_at'])

def downgrade():
    raise NotImplementedError("Downgrade not supported for 0016 - this is a structural table split")
