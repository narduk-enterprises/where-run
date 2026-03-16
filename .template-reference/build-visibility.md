# Build Visibility

Every app extending the shared layer exposes build metadata in three places:

- Browser console:
  - On first page load, the client plugin logs:
    - `[build] <appName> v<appVersion> · <buildVersion> · <buildTime>`
- Browser globals:
  - `window.__NARDUK_BUILD__`
- HTML and HTTP response metadata:
  - `<meta name="app-version" ...>`
  - `<meta name="build-version" ...>`
  - `<meta name="build-time" ...>`
  - `X-App-Version`
  - `X-Build-Version`
  - `X-Build-Time`

## What Each Value Means

- `appVersion`
  - The semantic version from the app package when available.
- `buildVersion`
  - Preferred order:
    - `BUILD_VERSION`
    - `GITHUB_SHA`
    - `CF_PAGES_COMMIT_SHA`
    - current git `HEAD` short SHA
    - `appVersion`
- `buildTime`
  - The ISO timestamp captured when Nuxt config is evaluated for the build.

## How To Check A Deploy

From the browser:

1. Open DevTools.
2. Hard refresh.
3. Look for the `[build] ...` line in the console.

From the terminal:

```bash
curl -I https://your-app.example.com
curl -s https://your-app.example.com | rg 'app-version|build-version|build-time'
```

## What Can Make This Look Wrong

- Old HTML cached at the browser or CDN edge.
  - You will see old `X-Build-Version`, old meta tags, and the old console line.
- A service worker serving stale HTML or JS.
  - The fleet was scanned for service worker registration and none were found at
    the time this was written.
- App-local overrides that inject their own build meta.
  - Duplicate console logs or duplicate meta tags are possible if an app adds
    its own build-info plugin or head tags.
- Building outside a git checkout.
  - `buildVersion` falls back to `appVersion`, so you lose per-deploy SHA
    visibility.
- Long-lived SWR/prerender on document routes.
  - App route rules that cache page HTML can intentionally keep older build
    markers visible until revalidation.

## Safe Patterns

- Use the shared layer metadata as the source of truth.
- If you need extra app-local diagnostics, add new fields instead of replacing
  the shared ones.
- Avoid custom document-level `build-time` meta tags or duplicate build-info
  console plugins.
- Prefer checking both console output and response headers when debugging cache
  behavior.
