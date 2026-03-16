import { describe, it, expect, vi } from 'vitest'
import { useDatabase } from '../../server/utils/database'

/**
 * Unit tests for the useDatabase server utility.
 *
 * Tests the per-request Drizzle instantiation pattern:
 * - Throws when D1 binding is missing
 * - Creates a Drizzle instance when binding is present
 * - Memoizes on event.context to avoid redundant instantiation
 */

// Mock Nitro auto-imports
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

// Mock drizzle-orm
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ __mock: true })),
}))

vi.mock('../../server/database/schema', () => ({}))

describe('useDatabase', () => {
  it('throws 500 when D1 binding is not available', () => {
    const event = {
      context: { cloudflare: { env: {} } },
    }
    expect(() => useDatabase(event as never)).toThrow('D1 database binding not available')
  })

  it('throws 500 when cloudflare context is missing', () => {
    const event = {
      context: {},
    }
    expect(() => useDatabase(event as never)).toThrow('D1 database binding not available')
  })

  it('returns a Drizzle instance when D1 binding exists', () => {
    const event = {
      context: {
        cloudflare: { env: { DB: { __d1: true } } },
      },
    }
    const db = useDatabase(event as never)
    expect(db).toBeDefined()
    expect(db).toEqual({ __mock: true })
  })

  it('memoizes the Drizzle instance on event.context._db', () => {
    const existingDb = { __cached: true }
    const event = {
      context: { _db: existingDb },
    }
    const db = useDatabase(event as never)
    expect(db).toBe(existingDb)
  })
})
