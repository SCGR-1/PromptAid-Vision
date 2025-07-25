"""init schema

Revision ID: ad38fd571716
Revises: 
Create Date: 2025-07-24 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ad38fd571716'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 1) Enable pgcrypto extension for gen_random_uuid()
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    # 2) Lookup tables
    op.create_table(
        'sources',
        sa.Column('s_code',   sa.Text(), primary_key=True),
        sa.Column('label',    sa.Text(), nullable=False),
    )
    op.create_table(
        'region',
        sa.Column('r_code',   sa.Text(), primary_key=True),
        sa.Column('label',    sa.Text(), nullable=False),
    )
    op.create_table(
        'category',
        sa.Column('cat_code', sa.Text(), primary_key=True),
        sa.Column('label',    sa.Text(), nullable=False),
    )
    op.create_table(
        'country',
        sa.Column('c_code',   sa.CHAR(length=2), primary_key=True),
        sa.Column('label',    sa.Text(),    nullable=False),
    )
    op.create_table(
        'model',
        sa.Column('m_code',   sa.Text(), primary_key=True),
        sa.Column('label',    sa.Text(), nullable=False),
    )

    # 3) maps table
    op.create_table(
        'maps',
        sa.Column('map_id',    sa.UUID(), 
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('file_key',  sa.Text(), nullable=False),
        sa.Column('sha256',    sa.Text(), nullable=False),
        sa.Column('source',    sa.Text(), nullable=False),
        sa.Column('region',    sa.Text(), nullable=False),
        sa.Column('category',  sa.Text(), nullable=False),
        sa.Column('created_at',sa.TIMESTAMP(timezone=True), 
                  server_default=sa.text('NOW()'),
                  nullable=False),
        sa.ForeignKeyConstraint(['source'],   ['sources.s_code']),
        sa.ForeignKeyConstraint(['region'],   ['region.r_code']),
        sa.ForeignKeyConstraint(['category'], ['category.cat_code']),
    )

    # 4) map_countries join table
    op.create_table(
        'map_countries',
        sa.Column('map_id', sa.UUID(),   nullable=False),
        sa.Column('c_code', sa.CHAR(length=2), nullable=False),
        sa.PrimaryKeyConstraint('map_id', 'c_code'),
        sa.ForeignKeyConstraint(['map_id'], ['maps.map_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['c_code'], ['country.c_code']),
    )

    # 5) captions table
    op.create_table(
        'captions',
        sa.Column('cap_id',    sa.UUID(),
                  server_default=sa.text('gen_random_uuid()'),
                  primary_key=True),
        sa.Column('map_id',    sa.UUID(),   nullable=False, unique=True),
        sa.Column('model',     sa.Text(),    nullable=False),
        sa.Column('raw_json',  sa.JSON(),    nullable=False),
        sa.Column('generated', sa.Text(),    nullable=False),
        sa.Column('edited',    sa.Text(),    nullable=True),
        sa.Column('accuracy',  sa.SmallInteger(), 
                  sa.CheckConstraint('accuracy BETWEEN 0 AND 100')),
        sa.Column('context',   sa.SmallInteger(), 
                  sa.CheckConstraint('context BETWEEN 0 AND 100')),
        sa.Column('usability', sa.SmallInteger(), 
                  sa.CheckConstraint('usability BETWEEN 0 AND 100')),
        sa.Column('created_at',sa.TIMESTAMP(timezone=True), 
                  server_default=sa.text('NOW()'),
                  nullable=False),
        sa.Column('updated_at',sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['map_id'], ['maps.map_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['model'],  ['model.m_code']),
    )


def downgrade():
    # drop in reverse order to respect FKs
    op.drop_table('captions')
    op.drop_table('map_countries')
    op.drop_table('maps')
    op.drop_table('model')
    op.drop_table('country')
    op.drop_table('category')
    op.drop_table('region')
    op.drop_table('sources')