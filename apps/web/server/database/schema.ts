/**
 * Where Run — App-specific database schema.
 *
 * Re-exports the layer's base tables (users, sessions) so that
 * drizzle-kit can discover them from this workspace.
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export * from '#layer/server/database/schema'

// ─── Races — Canonical race records (deduplicated, enriched) ──
export const races = sqliteTable('races', {
  id: text('id').primaryKey(),
  slug: text('slug'), // SEO-friendly URL slug
  name: text('name').notNull(),
  date: text('date').notNull(), // ISO date: YYYY-MM-DD
  endDate: text('end_date'), // Multi-day events
  city: text('city').notNull(),
  state: text('state').notNull(), // US state abbreviation
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  distanceMeters: integer('distance_meters'), // Distance in meters
  raceType: text('race_type').notNull(), // '5k' | '10k' | 'half' | 'marathon' | 'ultra' | 'trail' | 'other'
  url: text('url'), // Race website
  registrationUrl: text('registration_url'), // Direct registration link
  description: text('description'),
  logoUrl: text('logo_url'),
  source: text('source').notNull(), // 'runsignup' | 'manual'
  sourceId: text('source_id').notNull(), // External ID from source
  participantCount: integer('participant_count'),
  isVirtual: integer('is_virtual').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─── Race Sources — External data sources we scrape ──────────
export const raceSources = sqliteTable('race_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // 'RunSignUp'
  slug: text('slug').notNull().unique(), // 'runsignup'
  apiBaseUrl: text('api_base_url'),
  isActive: integer('is_active').notNull().default(1),
  lastScrapedAt: text('last_scraped_at'),
  totalRacesScraped: integer('total_races_scraped').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

// ─── Scrape Log — Track scraping runs ────────────────────────
export const scrapeLogs = sqliteTable('scrape_logs', {
  id: text('id').primaryKey(),
  sourceSlug: text('source_slug').notNull(),
  status: text('status').notNull(), // 'running' | 'success' | 'failed'
  racesFound: integer('races_found').notNull().default(0),
  racesInserted: integer('races_inserted').notNull().default(0),
  racesUpdated: integer('races_updated').notNull().default(0),
  errorMessage: text('error_message'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
})

// ─── Saved Races — User-bookmarked races ─────────────────────
export const savedRaces = sqliteTable('saved_races', {
  id: text('id').primaryKey(),
  raceId: text('race_id')
    .notNull()
    .references(() => races.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(), // Anonymous session tracking
  createdAt: text('created_at').notNull(),
})

// ─── API Cache — Cache external API responses ────────────────
export const apiCache = sqliteTable('api_cache', {
  key: text('key').primaryKey(),
  data: text('data').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
})

// ─── Type helpers ────────────────────────────────────────────
export type Race = typeof races.$inferSelect
export type NewRace = typeof races.$inferInsert
export type RaceSource = typeof raceSources.$inferSelect
export type ScrapeLog = typeof scrapeLogs.$inferSelect
export type SavedRace = typeof savedRaces.$inferSelect
