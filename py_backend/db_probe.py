import os
print('ENV URL repr:', repr(os.getenv('DATABASE_URL')))
from sqlalchemy import create_engine, text
u = os.getenv('DATABASE_URL')
engine = create_engine(u, pool_pre_ping=True, future=True)
with engine.connect() as c:
    print('Connected OK. version:', c.execute(text('select version()')).scalar())
