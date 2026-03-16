/**
 * D1 database middleware — NO-OP.
 *
 * Database initialization is now handled per-request by `useDatabase(event)`.
 * This file is kept as a no-op to prevent stale layer caches from attempting
 * to call the removed `initDatabase()` function.
 */
export default defineEventHandler(() => {
  // Drizzle is initialized per-request by useDatabase(event).
})
