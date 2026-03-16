/**
 * App-specific database schema.
 *
 * Re-exports the layer's base tables (users, sessions, todos) so that
 * drizzle-kit can discover them from this workspace. Add app-specific
 * tables below the re-export.
 */
export * from '#layer/server/database/schema'

// ─── App-Specific Tables ────────────────────────────────────
// Add your own tables here. Example:
//
// import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
//
// export const posts = sqliteTable('posts', {
//   id: integer('id').primaryKey({ autoIncrement: true }),
//   title: text('title').notNull(),
// })
