/**
 * CORS middleware — configurable cross-origin request handling.
 *
 * Reads allowed origins from `runtimeConfig.corsAllowedOrigins` (comma-separated string).
 * Defaults to same-origin only (no CORS headers added) when unconfigured.
 *
 * Handles:
 * - Preflight OPTIONS requests with 204 No Content
 * - Access-Control-Allow-Origin (exact origin matching, no wildcards)
 * - Access-Control-Allow-Methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
 * - Access-Control-Allow-Headers (Content-Type, Authorization, X-Requested-With)
 * - Access-Control-Max-Age (86400s / 24h cache for preflight responses)
 *
 * Skipped for:
 * - Non-API routes (only applies to /api/* paths)
 * - Same-origin requests (no Origin header)
 */
export default defineEventHandler((event) => {
  const path = event.path

  // Only apply CORS to API routes
  if (!path.startsWith('/api/')) return

  const origin = getHeader(event, 'origin')
  if (!origin) return // Same-origin request — no CORS needed

  // Read allowed origins from runtime config
  const config = useRuntimeConfig(event)
  const allowedOriginsRaw = (config as Record<string, unknown>).corsAllowedOrigins as
    | string
    | undefined

  // Default: no CORS allowed (same-origin only)
  if (!allowedOriginsRaw) return

  const allowedOrigins = allowedOriginsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  // Exact origin matching — no wildcard
  if (!allowedOrigins.includes(origin)) return

  // Set CORS headers
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })

  // Handle preflight
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
