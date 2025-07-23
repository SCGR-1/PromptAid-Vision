-- +goose Up

INSERT INTO sources (s_code, label)
VALUES
  ('_TBD_SOURCE',   'TBD placeholder')
ON CONFLICT (s_code) DO NOTHING;

INSERT INTO region (r_code, label)
VALUES
  ('_TBD_REGION',   'TBD placeholder')
ON CONFLICT (r_code) DO NOTHING;

INSERT INTO category (cat_code, label)
VALUES
  ('_TBD_CATEGORY', 'TBD placeholder')
ON CONFLICT (cat_code) DO NOTHING;

-- +goose Down

DELETE FROM category WHERE cat_code = '_TBD_CATEGORY';
DELETE FROM region   WHERE r_code    = '_TBD_REGION';
DELETE FROM sources  WHERE s_code    = '_TBD_SOURCE';
