import io, hashlib
from sqlalchemy.orm import Session
from . import models

def hash_bytes(data: bytes) -> str:
    """Compute SHA‑256 hex digest of the data."""
    return hashlib.sha256(data).hexdigest()

def create_map(db: Session, src, reg, cat, key, sha, countries: list[str]):
    """Insert into maps and map_countries."""
    m = models.Map(
        source=src, region=reg, category=cat,
        file_key=key, sha256=sha
    )
    db.add(m)
    db.flush()  # assign m.map_id

    # link countries
    for c in countries:
        country = db.get(models.Country, c)
        if country:
            m.countries.append(country)

    db.commit()
    db.refresh(m)
    return m

def get_map(db: Session, map_id):
    return db.get(models.Map, map_id)

def create_caption(db: Session, map_id, model_code, raw_json, text):
    c = models.Caption(
        map_id=map_id,
        model=model_code,
        raw_json=raw_json,
        generated=text
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

def get_caption(db: Session, cap_id):
    return db.get(models.Caption, cap_id)

def update_caption(db: Session, cap_id, edited, accuracy, context, usability):
    c = get_caption(db, cap_id)
    if not c:
        return None
    c.edited = edited
    c.accuracy = accuracy
    c.context = context
    c.usability = usability
    db.commit()
    db.refresh(c)
    return c
