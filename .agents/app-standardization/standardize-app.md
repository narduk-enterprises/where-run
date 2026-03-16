---
description:
  Standardize a single app on the latest narduk-nuxt-template (detects tier,
  runs appropriate steps)
---

# Standardize App

> **Context:** This workflow standardizes a single app in `~/new-code/` on the
> latest `narduk-nuxt-template`. It auto-detects the app's tier and runs only
> the necessary steps. Read `STANDARDIZATION.md` first for current status.

// turbo-all

## Prerequisites

1. Read `.agents/app-standardization/STANDARDIZATION.md` — find the app's tier
   and current status.
2. Confirm which app the user wants to standardize. If not specified, pick the
   next incomplete app in priority order (Tier 1 first).
3. Ensure `~/new-code/narduk-nuxt-template` is up to date:
   `cd ~/new-code/narduk-nuxt-template && git pull`

---

## Step 1: Detect Tier

```bash
APP=<app-name>
APP_DIR=~/new-code/$APP
```

Check the tier from `STANDARDIZATION.md`, or detect it:

| Check                                                                      | Result              |
| -------------------------------------------------------------------------- | ------------------- |
| Has `$APP_DIR/apps/web/nuxt.config.ts`?                                    | Monorepo structure  |
| `nuxt.config.ts` extends `@narduk-enterprises/narduk-nuxt-template-layer`? | Published layer ✅  |
| `nuxt.config.ts` extends `../../layers/...`?                               | Relative path ⚠️    |
| No `extends` clause + inline modules?                                      | Standalone (Tier 3) |

- **Tier 1:** Monorepo + published layer → go to **Step 2A**
- **Tier 2:** Flat + partial layer refs → go to **Step 2B**
- **Tier 3:** Flat + no layer → go to **Step 2B**

---

## Step 2A: Tier 1 Fixes (Quick)

These apps already have the right structure. Fix inconsistencies only.

### 2A.1: Fix relative path extends (if applicable)

If `nuxt.config.ts` has `extends: ['../../layers/narduk-nuxt-layer']`:

```diff
- extends: ['../../layers/narduk-nuxt-layer'],
+ extends: ['@narduk-enterprises/narduk-nuxt-template-layer'],
```

### 2A.2: Update layer to latest

```bash
cd $APP_DIR
pnpm run update-layer   # pulls latest layer from template repo
pnpm install
```

If `update-layer` script doesn't exist, manually:

```bash
rm -rf layers/narduk-nuxt-layer
cp -R ~/new-code/narduk-nuxt-template/layers/narduk-nuxt-layer layers/
pnpm install
```

### 2A.3: Normalize runtimeConfig

Compare `apps/web/nuxt.config.ts` against the canonical block in
`STANDARDIZATION.md`. Ensure all keys are present. Fix any missing or misordered
entries.

### 2A.3.5: Normalize CI/CD Workflow

Check `.github/workflows/ci.yml` against the 6 canonical requirements in
`STANDARDIZATION.md`. Common fixes:

```bash
# Copy the canonical ci.yml from the template
cp ~/new-code/narduk-nuxt-template/.github/workflows/ci.yml $APP_DIR/.github/workflows/ci.yml
```

Then strip template-only jobs:

- Remove `deploy-examples` job (matrix of example-auth, example-blog, etc.)
- Remove `deploy-showcase` job
- Keep: `quality`, `preflight`, `deploy` (targeting `apps/web`)

If the app has a separate `deploy.yml`, delete it — everything is combined in
`ci.yml`.

If the app has an old `ci.yml` with flat build paths or `dopplerhq/cli-action`,
**replace the entire file** with the canonical version.

### 2A.4: Provision missing analytics

```bash
cd $APP_DIR
doppler run --project $APP --config prd -- npx jiti tools/setup-analytics.ts status
```

If any service is missing:

```bash
doppler run --project $APP --config prd -- npx jiti tools/setup-analytics.ts all
```

If only IndexNow is missing:

```bash
doppler run --project $APP --config prd -- npx jiti tools/setup-analytics.ts indexnow
```

### 2A.5: Verify quality

```bash
cd $APP_DIR
pnpm run quality
```

Must pass with zero errors and warnings. Fix any issues found.

Go to **Step 3**.

---

## Step 2B: Full Migration (Tier 2 & 3)

Run the existing `/migrate-local` workflow. Key reminders:

1. **Read `/migrate-local` fully** before starting.
2. The source app is `~/new-code/<app-name>` (flat structure).
3. The new app will be scaffolded from `~/new-code/narduk-nuxt-template`.
4. During Phase 1 (inventory), be especially careful with Tier 3 apps — they
   inline everything the layer provides.
5. After migration completes, run **Step 2A.3** (normalize runtimeConfig) and
   **Step 2A.4** (provision analytics).

### Doppler Setup (if project doesn't exist yet)

```bash
# Create the project
doppler projects create $APP

# Wire hub references (copy from STANDARDIZATION.md "Doppler Cross-Reference Commands")
# Set per-app values
doppler secrets set "SITE_URL=https://your-domain.com" "APP_NAME=Display Name" --project $APP --config prd

# Provision analytics
doppler run --project $APP --config prd -- npx jiti tools/setup-analytics.ts all
```

### Tier 2 Special Cases

- **old-austin-grouch:** Search-replace all `nuxt-v4-template` references with
  `narduk-nuxt-template`.
- **narduk-enterprises-portfolio:** Already has some narduk deps — check for
  partial layer references.

### Tier 3 Special Cases

- **imessage-dictionary, nagolnagemluapleira, ogpreview-app:** These inline
  `@nuxt/ui`, `@nuxt/fonts`, etc. in their `nuxt.config.ts`. The layer provides
  all of these — delete the inline modules list after migration.

Go to **Step 3**.

---

## Step 3: Update Tracking

After completing the migration/fixes:

1. **Run the `/check-standardization` workflow** to verify everything passes.

2. **Update `STANDARDIZATION.md`:**
   - Set all columns to ✅ for the app.
   - Update `Last Updated` to today's date.
   - Append a migration log entry:

```markdown
### <app-name> — <date>

- **Migrated by:** <conversation ID or agent>
- **Tier:** <1/2/3>
- **Work done:** <brief summary>
- **Quality:** pnpm run quality → pass
- **Deployed:** no (pending user deploy)
```

3. **Commit:**

```bash
cd $APP_DIR
git add . && git commit -m "chore: standardize on narduk-nuxt-template"
```

---

## Priority Order

From STANDARDIZATION.md, the recommended order is:

1. **Tier 1 batch:** neon-sewer-raid, enigma-box, tiny-invoice,
   austin-texas-net, circuit-breaker-online (then clawdle, flashcard-pro,
   papa-everetts-pizza for verification)
2. **Tier 2:** old-austin-grouch, narduk-enterprises-portfolio
3. **Tier 3:** ogpreview-app, nagolnagemluapleira, imessage-dictionary
4. **Skip:** drift-map (template clone — confirm with user if it should be
   deleted)
