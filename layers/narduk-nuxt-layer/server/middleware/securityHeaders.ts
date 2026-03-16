/**
 * Security headers middleware.
 *
 * Sets standard security headers on every response to protect against
 * common web vulnerabilities. These supplement Cloudflare's built-in
 * protections with application-level defense-in-depth.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const isDev = import.meta.dev
  const appVersion = config.public.appVersion || ''
  const buildVersion = config.public.buildVersion || appVersion || ''
  const buildTime = config.public.buildTime || ''

  // 1. Gather our baseline required sources
  const baseScriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://*.googletagmanager.com',
    'https://us.i.posthog.com',
    'https://us-assets.i.posthog.com',
    'https://static.cloudflareinsights.com',
    'https://cdn.apple-mapkit.com',
    'https://pagead2.googlesyndication.com',
  ]

  const baseConnectSrc = [
    "'self'",
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
    'https://us.i.posthog.com',
    'https://us-assets.i.posthog.com',
    'https://*.apple-mapkit.com',
    'https://*.apple.com',
  ]

  // 2. Add dev-only connections
  if (isDev) {
    baseConnectSrc.push('http:', 'https:', 'ws:', 'wss:')
  }

  // 3. Inject explicit posthogHost if it's not the default
  if (config.public.posthogHost && config.public.posthogHost !== 'https://us.i.posthog.com') {
    baseScriptSrc.push(config.public.posthogHost)
    baseConnectSrc.push(config.public.posthogHost)
  }

  // 4. Inject arbitrary comma-separated overrides from Doppler (e.g., CSP_SCRIPT_SRC, CSP_CONNECT_SRC)
  if (config.public.cspScriptSrc) {
    const customScripts = config.public.cspScriptSrc
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    baseScriptSrc.push(...customScripts)
  }

  if (config.public.cspConnectSrc) {
    const customConnects = config.public.cspConnectSrc
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    baseConnectSrc.push(...customConnects)
  }

  // 5. Deduplicate sources using Sets, then join with spaces
  const finalScriptSrc = `script-src ${Array.from(new Set(baseScriptSrc)).join(' ')}`
  const finalConnectSrc = `connect-src ${Array.from(new Set(baseConnectSrc)).join(' ')}`

  const diagnosticHeaders: Record<string, string> = {}
  if (appVersion) diagnosticHeaders['X-App-Version'] = appVersion
  if (buildVersion) diagnosticHeaders['X-Build-Version'] = buildVersion
  if (buildTime) diagnosticHeaders['X-Build-Time'] = buildTime

  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      finalScriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      finalConnectSrc,
      "frame-ancestors 'none'",
    ].join('; '),
    ...diagnosticHeaders,
  })
})
