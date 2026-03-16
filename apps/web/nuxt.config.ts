import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Extend the published Narduk Nuxt Layer
  extends: ['@narduk-enterprises/narduk-nuxt-template-layer'],

  // App-level CSS override (athletic design system with Barlow fonts)
  css: ['~/assets/css/main.css'],

  // nitro-cloudflare-dev proxies D1 bindings to the local dev server
  modules: ['nitro-cloudflare-dev'],

  nitro: {
    cloudflareDev: {
      configPath: resolve(__dirname, 'wrangler.json'),
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  devServer: {
    port: Number(process.env.NUXT_PORT || 3000),
  },

  runtimeConfig: {
    // Server-only
    cronSecret: process.env.CRON_SECRET || '',
    googleServiceAccountKey: process.env.GSC_SERVICE_ACCOUNT_JSON || '',
    posthogApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
    gaPropertyId: process.env.GA_PROPERTY_ID || '',
    posthogProjectId: process.env.POSTHOG_PROJECT_ID || '',
    public: {
      appUrl: process.env.SITE_URL || 'https://where-run.nard.uk',
      appName: process.env.APP_NAME || 'Where Run',
      // Analytics (client-side tracking)
      posthogPublicKey: process.env.POSTHOG_PUBLIC_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
      // IndexNow
      indexNowKey: process.env.INDEXNOW_KEY || '',
    },
  },

  site: {
    url: process.env.SITE_URL || 'https://where-run.nard.uk',
    name: 'Where Run',
    description:
      'Discover running races across the United States. Search 5Ks, 10Ks, half marathons, marathons, ultras, and trail runs near you.',
    defaultLocale: 'en',
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Where Run',
      url: process.env.SITE_URL || 'https://where-run.nard.uk',
      logo: '/favicon.svg',
    },
  },

  image: {
    cloudflare: {
      baseURL: process.env.SITE_URL || 'https://where-run.nard.uk',
    },
  },

  routeRules: {
    // ISR caching for race detail and state pages
    '/race/**': { swr: 3600 },
    '/states/**': { swr: 3600 },
    // API caching for read-only endpoints
    '/api/races': { swr: 600 },
    '/api/races/states': { swr: 3600 },
    '/api/races/nearby': { swr: 600 },
    '/api/races/by-state/**': { swr: 1800 },
  },
})
