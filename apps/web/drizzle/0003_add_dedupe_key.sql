-- Add dedupeKey column for cross-source deduplication
ALTER TABLE races ADD COLUMN dedupe_key TEXT;
CREATE INDEX IF NOT EXISTS idx_races_dedupe_key ON races(dedupe_key);
