/// <reference types="@cloudflare/workers-types" />
import type { H3Event } from 'h3'
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

/**
 * Return a Drizzle ORM instance for the current request.
 *
 * Creates a lightweight per-request wrapper from the Cloudflare D1 binding.
 * Memoized on `event.context` to avoid redundant instantiation within a single
 * request lifecycle. This avoids module-scope singletons which risk stale
 * bindings across isolate reuse on Cloudflare Workers.
 */
export function useDatabase(event: H3Event): DrizzleD1Database<typeof schema> {
  if (event.context._db) {
    return event.context._db
  }

  const d1 = (event.context.cloudflare?.env as { DB?: D1Database })?.DB
  if (!d1) {
    throw createError({
      statusCode: 500,
      message: 'D1 database binding not available. Ensure DB is configured in wrangler.json.',
    })
  }

  const db = drizzle(d1, { schema })
  event.context._db = db
  return db
}
