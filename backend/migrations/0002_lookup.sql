-- +goose Up

-- Sources
INSERT INTO sources (s_code, label) VALUES
  ('WFP_ADAM',    'WFP ADAM – Automated Disaster Analysis & Mapping'),
  ('PDC',         'Pacific Disaster Center (PDC)'),
  ('GDACS',       'GDACS – Global Disaster Alert & Coordination System'),
  ('GFL_HUB',     'Google Flood Hub'),
  ('GFL_GENCAST', 'Google GenCast'),
  ('USGS',        'USGS – United States Geological Survey')
ON CONFLICT (s_code) DO NOTHING;

-- Regions
INSERT INTO region (r_code, label) VALUES
  ('AFR','Africa'), ('AMR','Americas'), ('APA','Asia‑Pacific'),
  ('EUR','Europe'), ('MENA','Middle East & North Africa')
ON CONFLICT (r_code) DO NOTHING;

-- Categories
INSERT INTO category (cat_code, label) VALUES
  ('FLOOD','Flood'), ('WILDFIRE','Wildfire'), ('EARTHQUAKE','Earthquake'), 
  ('CYCLONE','Cyclone'), ('DROUGHT','Drought'), ('LANDSLIDE','Landslide'), 
  ('TORNADO','Tornado'), ('VOLCANO','Volcano'), ('OTHER','Other')
ON CONFLICT (cat_code) DO NOTHING;

-- Models
INSERT INTO model (m_code, label) VALUES
  ('GPT‑4O','GPT‑4o Vision'), ('GEMINI15','Gemini 1.5 Pro'), ('CLAUDE3','Claude 3 Sonnet')
ON CONFLICT (m_code) DO NOTHING;

-- +goose Down
DELETE FROM sources  WHERE s_code IN ('WFP_ADAM','PDC','GDACS','GFL_HUB','GFL_GENCAST','USGS');
DELETE FROM region   WHERE r_code IN ('AFR','AMR','APA','EUR','MENA');
DELETE FROM category WHERE cat_code IN ('FLOOD','WILDFIRE','EARTHQUAKE','CYCLONE','DROUGHT','LANDSLIDE','TORNADO','VOLCANO','OTHER');
DELETE FROM model     WHERE m_code IN ('GPT‑4O','GEMINI15','CLAUDE3');


