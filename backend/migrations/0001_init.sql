-- +goose Up
-- Initial schema

CREATE TABLE sources   (s_code TEXT PRIMARY KEY, label TEXT NOT NULL);
CREATE TABLE region    (r_code TEXT PRIMARY KEY, label TEXT NOT NULL);
CREATE TABLE category  (cat_code TEXT PRIMARY KEY, label TEXT NOT NULL);
CREATE TABLE country   (c_code CHAR(2) PRIMARY KEY, label TEXT NOT NULL);
CREATE TABLE model     (m_code TEXT PRIMARY KEY, label TEXT NOT NULL);

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE maps (
    map_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_key   TEXT NOT NULL,
    sha256     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source     TEXT NOT NULL REFERENCES sources(s_code),
    region     TEXT NOT NULL REFERENCES region(r_code),
    category   TEXT NOT NULL REFERENCES category(cat_code)
);

CREATE TABLE map_countries (
    map_id UUID    REFERENCES maps(map_id) ON DELETE CASCADE,
    c_code CHAR(2) REFERENCES country(c_code),
    PRIMARY KEY (map_id, c_code)
);

CREATE TABLE captions (
    cap_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id    UUID UNIQUE REFERENCES maps(map_id) ON DELETE CASCADE,
    model     TEXT NOT NULL REFERENCES model(m_code),
    raw_json  JSONB NOT NULL,
    generated TEXT NOT NULL,
    edited    TEXT,
    accuracy  SMALLINT CHECK (accuracy  BETWEEN 0 AND 100),
    context   SMALLINT CHECK (context   BETWEEN 0 AND 100),
    usability SMALLINT CHECK (usability BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- +goose Down
DROP TABLE IF EXISTS captions;
DROP TABLE IF EXISTS map_countries;
DROP TABLE IF EXISTS maps;
DROP TABLE IF EXISTS model;
DROP TABLE IF EXISTS country;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS region;
DROP TABLE IF EXISTS sources;

