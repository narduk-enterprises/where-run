-- Add slug column and city index for browse-by-city
ALTER TABLE races ADD COLUMN slug TEXT;
CREATE INDEX IF NOT EXISTS idx_races_slug ON races(slug);
CREATE INDEX IF NOT EXISTS idx_races_city ON races(city);
CREATE INDEX IF NOT EXISTS idx_races_state_city ON races(state, city);
