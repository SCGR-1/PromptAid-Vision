import os
from sqlalchemy import create_engine
u = os.getenv('DATABASE_URL')
print('URL:', u)
e = create_engine(u, pool_pre_ping=True)
print('Dialect:', e.dialect.name, 'Driver:', e.dialect.driver)
with e.connect() as c:
    print('Connected OK:', c.exec_driver_sql('select version()').scalar())
