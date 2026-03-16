-- Where Run app-specific tables
-- Migration: 0001_where_run_schema

-- Races — Canonical race records (deduplicated, enriched)
CREATE TABLE IF NOT EXISTS `races` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `date` text NOT NULL,
  `end_date` text,
  `city` text NOT NULL,
  `state` text NOT NULL,
  `latitude` real NOT NULL,
  `longitude` real NOT NULL,
  `distance_meters` integer,
  `race_type` text NOT NULL,
  `url` text,
  `registration_url` text,
  `description` text,
  `logo_url` text,
  `source` text NOT NULL,
  `source_id` text NOT NULL,
  `participant_count` integer,
  `is_virtual` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_races_date` ON `races` (`date`);
CREATE INDEX IF NOT EXISTS `idx_races_state` ON `races` (`state`);
CREATE INDEX IF NOT EXISTS `idx_races_type` ON `races` (`race_type`);
CREATE INDEX IF NOT EXISTS `idx_races_source` ON `races` (`source`, `source_id`);
CREATE INDEX IF NOT EXISTS `idx_races_location` ON `races` (`latitude`, `longitude`);

-- Race Sources — External data sources we scrape
CREATE TABLE IF NOT EXISTS `race_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL UNIQUE,
  `api_base_url` text,
  `is_active` integer NOT NULL DEFAULT 1,
  `last_scraped_at` text,
  `total_races_scraped` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL
);

-- Scrape Logs — Track scraping runs
CREATE TABLE IF NOT EXISTS `scrape_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `source_slug` text NOT NULL,
  `status` text NOT NULL,
  `races_found` integer NOT NULL DEFAULT 0,
  `races_inserted` integer NOT NULL DEFAULT 0,
  `races_updated` integer NOT NULL DEFAULT 0,
  `error_message` text,
  `started_at` text NOT NULL,
  `completed_at` text
);

-- Saved Races — User-bookmarked races
CREATE TABLE IF NOT EXISTS `saved_races` (
  `id` text PRIMARY KEY NOT NULL,
  `race_id` text NOT NULL REFERENCES `races`(`id`) ON DELETE CASCADE,
  `session_id` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_saved_races_session` ON `saved_races` (`session_id`);

-- API Cache — Cache external API responses
CREATE TABLE IF NOT EXISTS `api_cache` (
  `key` text PRIMARY KEY NOT NULL,
  `data` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
