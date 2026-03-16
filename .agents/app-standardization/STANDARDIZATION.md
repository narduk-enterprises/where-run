# Fleet Standardization Tracker

> **Purpose:** Single source of truth for cross-project standardization
> progress. Agents update this file as they complete work across conversations.
>
> **Delete when done:** `rm -rf .agents/app-standardization/`

---

## App Status Matrix

Legend: ✅ done | ⚠️ partial | ❌ missing | ⬜ not checked

| App                          | Tier | Structure   | Layer                    | Analytics             | CI/CD               | Quality | Deployed | Last Updated |
| ---------------------------- | ---- | ----------- | ------------------------ | --------------------- | ------------------- | ------- | -------- | ------------ |
| austin-texas-net             | 1    | ✅ monorepo | ✅ published             | ✅ GA+GSC+INow+PH     | ✅ canonical        | ⬜      | ⬜       | 2026-03-03   |
| circuit-breaker-online       | 1    | ✅ monorepo | ✅ published             | ✅ GA+GSC+INow+PH     | ✅ canonical        | ⬜      | ⬜       | 2026-03-03   |
| clawdle                      | 1    | ✅ monorepo | ✅ published             | ✅ GA+GSC+INow+PH     | ✅ canonical        | ⬜      | ⬜       | 2026-03-03   |
| flashcard-pro                | 1    | ✅ monorepo | ✅ published             | ✅ GA+GSC+INow+PH     | ✅ canonical        | ⬜      | ⬜       | 2026-03-03   |
| papa-everetts-pizza          | 1    | ✅ monorepo | ✅ published             | ✅ GA+GSC+INow+PH     | ❌ old + deploy.yml | ⬜      | ⬜       | 2026-03-03   |
| enigma-box                   | 1    | ✅ monorepo | ✅ published             | ⚠️ no GA, no INow     | ✅ canonical        | ⬜      | ⬜       | 2026-03-03   |
| tiny-invoice                 | 1    | ✅ monorepo | ✅ published             | ⚠️ no GA, no INow     | ✅ canonical        | ⬜      | ⬜       | 2026-03-03   |
| neon-sewer-raid              | 1    | ✅ monorepo | ✅ published             | ✅ GA+GSC+INow+PH     | ✅ canonical        | ✅      | ⬜       | 2026-03-03   |
| old-austin-grouch            | 2    | ❌ flat     | ⚠️ uses nuxt-v4-template | ✅ GA+GSC+INow+PH     | ❌ old + deploy.yml | ⬜      | ⬜       | 2026-03-03   |
| narduk-enterprises-portfolio | 2    | ❌ flat     | ⚠️ partial narduk ref    | ✅ GA+GSC+INow+PH     | ❌ old + deploy.yml | ⬜      | ⬜       | 2026-03-03   |
| ogpreview-app                | 3    | ❌ flat     | ❌ none                  | ✅ GA+GSC+INow+PH     | ❌ old + deploy.yml | ⬜      | ⬜       | 2026-03-03   |
| imessage-dictionary          | 3    | ❌ flat     | ❌ none                  | ✅ GA+GSC+INow+PH     | ❌ old + deploy.yml | ⬜      | ⬜       | 2026-03-03   |
| nagolnagemluapleira          | 3    | ❌ flat     | ❌ none                  | ✅ GA+GSC+INow+PH     | ❌ old + deploy.yml | ⬜      | ⬜       | 2026-03-03   |
| drift-map                    | skip | ✅ monorepo | ✅ published             | ❌ no Doppler project | —                   | —       | —        | 2026-03-03   |

### Column Definitions

- **Structure:** `monorepo` = has `apps/web/` + `layers/narduk-nuxt-layer/`
- **Layer:** `published` = extends
  `@narduk-enterprises/narduk-nuxt-template-layer`; `relative path` = uses
  `../../layers/...`
- **Analytics:** GA = GA_MEASUREMENT_ID; GSC = SITE_URL +
  GSC_SERVICE_ACCOUNT_JSON; INow = INDEXNOW_KEY
- **CI/CD:** GitHub Actions uses canonical `ci.yml` (see requirements below)
- **Quality:** `pnpm run quality` passes with zero errors/warnings
- **Deployed:** Latest code deployed to Cloudflare and verified

---

## Tier Definitions

| Tier  | What's Needed                                                   | Estimated Time |
| ----- | --------------------------------------------------------------- | -------------- |
| **1** | Fix config issues, update layer, provision missing analytics    | ~5 min/app     |
| **2** | Full `/migrate-local` structural migration + analytics          | ~30 min/app    |
| **3** | Full migration + strip inlined modules + analytics from scratch | ~45 min/app    |

---

## Canonical CI/CD Workflow (`ci.yml`)

Every app must use a **single combined `ci.yml`** (not separate `ci.yml` +
`deploy.yml`). The canonical workflow has these **6 requirements**:

| #   | Requirement                      | What To Check                                                                                     |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | **Preflight job**                | `preflight` job validates `DOPPLER_TOKEN` vs direct CF credentials before deploy                  |
| 2   | **Doppler secrets-fetch-action** | Uses `dopplerhq/secrets-fetch-action@v1.3.1` (NOT `dopplerhq/cli-action@v3` + manual download)    |
| 3   | **working-directory: apps/web**  | `build`, `deploy`, and `D1 migration` steps all use `working-directory: apps/web`                 |
| 4   | **D1 remote migrations**         | Runs `db:migrate` with `--remote` flag before `wrangler deploy`                                   |
| 5   | **Nuxt prepare loop**            | Iterates all `apps/*/nuxt.config.ts` and `layers/*/nuxt.config.ts` (not bare `pnpm nuxt prepare`) |
| 6   | **Unit test step**               | Runs `pnpm -r --if-present test:unit` after quality gate                                          |

### Anti-patterns to fix during migration

| Old Pattern                                                                                  | Standard Pattern                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `dopplerhq/cli-action@v3` + `doppler secrets download --no-file --format env >> $GITHUB_ENV` | `dopplerhq/secrets-fetch-action@v1.3.1` with `inject-env-vars: true`    |
| Flat `pnpm build` at repo root                                                               | `working-directory: apps/web` + `pnpm build`                            |
| Flat `pnpm exec wrangler deploy`                                                             | `working-directory: apps/web` + `pnpm exec wrangler deploy`             |
| `pnpm exec nuxt prepare` (bare)                                                              | `for cfg in apps/*/nuxt.config.ts layers/*/nuxt.config.ts; do ... done` |
| Separate `ci.yml` + `deploy.yml`                                                             | Single combined `ci.yml`                                                |
| No preflight step                                                                            | `preflight` job with credential validation                              |
| `.nuxt` / `.output` cache at root                                                            | Cache paths under `apps/web/.nuxt`, `apps/web/.output`                  |
| No D1 migration step                                                                         | Dynamic `--local` → `--remote` replacement from `package.json` scripts  |

**Canonical source:** Copy from
`~/new-code/narduk-nuxt-template/.github/workflows/ci.yml` and remove the
`deploy-examples` and `deploy-showcase` jobs (those are template-only).

---

## Doppler Hub-Spoke Verification

> [!IMPORTANT] Every spoke project's cross-references **must** point to the
> correct hub. A common bug is cross-refs pointing to the app's own project
> (e.g. `${neon-sewer-raid.prd.CLOUDFLARE_API_TOKEN}` instead of
> `${narduk-nuxt-template.prd.CLOUDFLARE_API_TOKEN}`). This happens when the
> init script's string replacement accidentally rewrites the hub name.

### Correct Hub Targets

| Key                        | Must Point To                                       | Hub Project            |
| -------------------------- | --------------------------------------------------- | ---------------------- |
| `CLOUDFLARE_API_TOKEN`     | `${narduk-nuxt-template.prd.CLOUDFLARE_API_TOKEN}`  | `narduk-nuxt-template` |
| `CLOUDFLARE_ACCOUNT_ID`    | `${narduk-nuxt-template.prd.CLOUDFLARE_ACCOUNT_ID}` | `narduk-nuxt-template` |
| `POSTHOG_PUBLIC_KEY`       | `${narduk-analytics.prd.POSTHOG_PUBLIC_KEY}`        | `narduk-analytics`     |
| `POSTHOG_PROJECT_ID`       | `${narduk-analytics.prd.POSTHOG_PROJECT_ID}`        | `narduk-analytics`     |
| `POSTHOG_HOST`             | `${narduk-analytics.prd.POSTHOG_HOST}`              | `narduk-analytics`     |
| `GA_ACCOUNT_ID`            | `${narduk-analytics.prd.GA_ACCOUNT_ID}`             | `narduk-analytics`     |
| `GSC_SERVICE_ACCOUNT_JSON` | `${narduk-analytics.prd.GSC_SERVICE_ACCOUNT_JSON}`  | `narduk-analytics`     |
| `GSC_USER_EMAIL`           | `${narduk-analytics.prd.GSC_USER_EMAIL}`            | `narduk-analytics`     |

### How to Fix Wrong Cross-Refs

```bash
APP=your-app-name

# Infrastructure hub (narduk-nuxt-template)
doppler secrets set \
  'CLOUDFLARE_API_TOKEN=${narduk-nuxt-template.prd.CLOUDFLARE_API_TOKEN}' \
  'CLOUDFLARE_ACCOUNT_ID=${narduk-nuxt-template.prd.CLOUDFLARE_ACCOUNT_ID}' \
  --project "$APP" --config prd

# Analytics hub (narduk-analytics)
doppler secrets set \
  'POSTHOG_PUBLIC_KEY=${narduk-analytics.prd.POSTHOG_PUBLIC_KEY}' \
  'POSTHOG_PROJECT_ID=${narduk-analytics.prd.POSTHOG_PROJECT_ID}' \
  'POSTHOG_HOST=${narduk-analytics.prd.POSTHOG_HOST}' \
  'GA_ACCOUNT_ID=${narduk-analytics.prd.GA_ACCOUNT_ID}' \
  'GSC_SERVICE_ACCOUNT_JSON=${narduk-analytics.prd.GSC_SERVICE_ACCOUNT_JSON}' \
  'GSC_USER_EMAIL=${narduk-analytics.prd.GSC_USER_EMAIL}' \
  --project "$APP" --config prd
```

---

## Additional Standardization Requirements

These were discovered during the deep-dive audit on 2026-03-03.

### ESLint Infrastructure

Every app must have:

- `packages/eslint-config/` workspace package (linked from the template)
- `apps/web/eslint.config.mjs` (not root-level) importing
  `@narduk/eslint-config`:
  ```js
  import withNuxt from './.nuxt/eslint.config.mjs'
  import { sharedConfigs } from '@narduk/eslint-config'
  export default withNuxt(...sharedConfigs)
  ```

| App                                                                                                         | Status                                                               |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| austin-texas-net, circuit-breaker-online, clawdle, enigma-box, flashcard-pro, neon-sewer-raid, tiny-invoice | ✅ `@narduk/eslint-config` in `apps/web/`                            |
| papa-everetts-pizza                                                                                         | ⚠️ ESLint at root, no `@narduk/eslint-config`                        |
| old-austin-grouch, narduk-enterprises-portfolio, ogpreview-app, imessage-dictionary, nagolnagemluapleira    | ❌ No `packages/eslint-config`, root-level eslint, no shared configs |

### Environment File Cleanup

**Rule:** No `.env`, `.env.*`, or `.dev.vars` files should exist in any app. All
secrets come from Doppler.

| App               | Issue                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| austin-texas-net  | ⚠️ Has `.env.old`, `.env.content.example`, `.env.content` — delete all |
| old-austin-grouch | ⚠️ Has `.dev.vars` + `.env` — delete both                              |
| All others        | ✅ Clean                                                               |

### Tools Directory

Every app should have these canonical tools (matching the template):

| Required Tool          | Purpose                     |
| ---------------------- | --------------------------- |
| `init.ts`              | Project initialization      |
| `setup-analytics.ts`   | Analytics bootstrapping     |
| `gsc-toolbox.ts`       | GSC/Indexing CLI            |
| `generate-favicons.ts` | Favicon generation from SVG |
| `update-layer.ts`      | Layer sync from template    |
| `validate.ts`          | Infrastructure validation   |

**Stale files to delete:**

- `tools/eslint-plugin-vue-official-best-practices/` — moved to
  `packages/eslint-config/` in the monorepo architecture. Found in:
  papa-everetts-pizza, old-austin-grouch, narduk-enterprises-portfolio,
  ogpreview-app, imessage-dictionary, nagolnagemluapleira
- `tools/init_new.ts` — found in austin-texas-net (likely a migration leftover)

### Agent Workflows Drift

Template has **24 workflows** in `.agents/workflows/`. Apps sourced from older
templates have only 10-12. During migration, the full workflow set is copied
over, but existing apps may be missing newer workflows like
`/check-standardization`, `/generate-brand-identity`, etc.

### Turbo.json

Required for monorepo task orchestration. Missing from:

- neon-sewer-raid, papa-everetts-pizza, and all 5 flat apps

Copy from template:
`cp ~/new-code/narduk-nuxt-template/turbo.json $APP_DIR/turbo.json`

### .gitignore — Missing `doppler.yaml`

The `.gitignore` must include `doppler.yaml` to prevent Doppler config from
being committed. Missing in:

- austin-texas-net, papa-everetts-pizza, old-austin-grouch,
  narduk-enterprises-portfolio, ogpreview-app, imessage-dictionary,
  nagolnagemluapleira

### GitHub Workflows Cleanup

| Workflow              | Rule                                         | Apps Affected                                                                                                                                                |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `version-bump.yml`    | Required for semantic versioning             | Missing from: neon-sewer-raid, papa-everetts-pizza, old-austin-grouch, narduk-enterprises-portfolio, ogpreview-app, imessage-dictionary, nagolnagemluapleira |
| `publish-layer.yml`   | Template-only — **delete** from derived apps | ⚠️ Found in: austin-texas-net                                                                                                                                |
| `deploy-showcase.yml` | Template-only — **delete** from derived apps | None found (good)                                                                                                                                            |

### Root `package.json` Scripts

Every app must have these scripts in the root `package.json`:

| Script          | Purpose                   | Missing From                                                                                                                             |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `quality`       | `turbo lint typecheck`    | ✅ All apps have this                                                                                                                    |
| `update-layer`  | Sync layer from template  | flashcard-pro, neon-sewer-raid, old-austin-grouch, narduk-enterprises-portfolio, ogpreview-app, imessage-dictionary, nagolnagemluapleira |
| `validate`      | Infrastructure validation | old-austin-grouch, narduk-enterprises-portfolio, ogpreview-app, imessage-dictionary, nagolnagemluapleira                                 |
| `setup`         | Init script               | neon-sewer-raid, narduk-enterprises-portfolio, imessage-dictionary, nagolnagemluapleira                                                  |
| `build:plugins` | ESLint plugin compilation | ✅ All apps have this                                                                                                                    |

### app.config.ts

Required for Nuxt UI color tokens and theme configuration. Expected at
`apps/web/app/app.config.ts`.

**Missing entirely:** neon-sewer-raid

### Stale Example App Directories

All 8 monorepo apps still have exactly **1 example-\* directory** each. These
should be deleted during standardization (they're template-only reference
implementations).

### D1 Database Naming

Most apps use `<app-name>-db` naming. Inconsistencies:

- **austin-texas-net:** Uses `austin-texas-net` (no `-db` suffix)
- **old-austin-grouch:** Uses `old-austin-grouch` (no `-db` suffix)
- **imessage-dictionary:** Uses `dict-nard-uk-db` (non-matching name)

> [!NOTE] D1 database names can't be renamed after creation — just document
> these and leave as-is.

### nuxt.config.ts Consistency

Beyond `runtimeConfig`, these fields must be present in
`apps/web/nuxt.config.ts`:

| Field                                 | Purpose                 | Missing From                            |
| ------------------------------------- | ----------------------- | --------------------------------------- |
| `future: { compatibilityVersion: 4 }` | Nuxt 4 compat mode      | circuit-breaker-online, neon-sewer-raid |
| `modules: ['nitro-cloudflare-dev']`   | Local D1/KV/R2 proxy    | neon-sewer-raid                         |
| `nitro.cloudflareDev.configPath`      | Points to wrangler.json | neon-sewer-raid                         |
| `site: { ... }`                       | SEO metadata            | ✅ All apps have this                   |
| `schemaOrg: { ... }`                  | Schema.org identity     | ✅ All apps have this                   |

---

## Canonical runtimeConfig Block

Every app's `apps/web/nuxt.config.ts` must include this exact `runtimeConfig`
pattern:

```ts
runtimeConfig: {
  // Server-only (admin API routes)
  googleServiceAccountKey: process.env.GSC_SERVICE_ACCOUNT_JSON || '',
  posthogApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
  gaPropertyId: process.env.GA_PROPERTY_ID || '',
  posthogProjectId: process.env.POSTHOG_PROJECT_ID || '',
  public: {
    appUrl: process.env.SITE_URL || 'https://YOUR_DOMAIN',
    appName: process.env.APP_NAME || 'Your App Name',
    // Analytics (client-side tracking)
    posthogPublicKey: process.env.POSTHOG_PUBLIC_KEY || '',
    posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
    // IndexNow
    indexNowKey: process.env.INDEXNOW_KEY || '',
  }
},
```

---

## Doppler Cross-Reference Commands

When setting up a new app's Doppler project, wire these hub references:

```bash
APP=your-app-name

# Infrastructure (from narduk-nuxt-template hub)
doppler secrets set \
  'CLOUDFLARE_API_TOKEN=${narduk-nuxt-template.prd.CLOUDFLARE_API_TOKEN}' \
  'CLOUDFLARE_ACCOUNT_ID=${narduk-nuxt-template.prd.CLOUDFLARE_ACCOUNT_ID}' \
  --project "$APP" --config prd

# Analytics (from narduk-analytics hub)
doppler secrets set \
  'POSTHOG_PUBLIC_KEY=${narduk-analytics.prd.POSTHOG_PUBLIC_KEY}' \
  'POSTHOG_PROJECT_ID=${narduk-analytics.prd.POSTHOG_PROJECT_ID}' \
  'POSTHOG_HOST=${narduk-analytics.prd.POSTHOG_HOST}' \
  'GA_ACCOUNT_ID=${narduk-analytics.prd.GA_ACCOUNT_ID}' \
  'GSC_SERVICE_ACCOUNT_JSON=${narduk-analytics.prd.GSC_SERVICE_ACCOUNT_JSON}' \
  'GSC_USER_EMAIL=${narduk-analytics.prd.GSC_USER_EMAIL}' \
  --project "$APP" --config prd

# Per-app (set individually)
doppler secrets set \
  "SITE_URL=https://your-domain.com" \
  "APP_NAME=Your App Name" \
  --project "$APP" --config prd

# Then provision GA4 + IndexNow
doppler run --project "$APP" --config prd -- npx jiti tools/setup-analytics.ts all
```

---

## Per-App Migration Log

> **Agents:** Append entries here after completing each migration.

### neon-sewer-raid — 2026-03-03

- **Migrated by:** 5284f31f-7c42-4e17-bf7b-d4ae7ee4cb99
- **Tier:** 1
- **Work done:** Fixed `extends` from relative path
  `../../layers/narduk-nuxt-layer` to published package
  `@narduk-enterprises/narduk-nuxt-template-layer`. Added
  `@narduk-enterprises/narduk-nuxt-template-layer` as `workspace:*` dependency.
  Updated `db:seed` script to use `node_modules/` path. Updated local layer copy
  from template repo.
- **Quality:** pnpm run quality → pass
- **Deployed:** no (pending user deploy)

<!-- Template:
### [app-name] — [date]
- **Migrated by:** [agent conversation ID]
- **Tier:** [1/2/3]
- **Work done:** [brief summary]
- **Quality:** pnpm run quality → [pass/fail]
- **Deployed:** [yes/no]
-->
