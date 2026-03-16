---
description:
  Verify an app meets standardization requirements after migration or fixes
---

# Check Standardization

> **Run this after completing any standardization work.** Reports pass/fail on
> all 7 requirements.

// turbo-all

## Usage

Run inside the target app directory:

```bash
cd ~/new-code/<app-name>
```

---

## Checklist

### 1. Monorepo Structure

```bash
# PASS if apps/web/nuxt.config.ts exists
test -f apps/web/nuxt.config.ts && echo "✅ Monorepo structure" || echo "❌ Missing apps/web/nuxt.config.ts"
```

### 2. Published Layer Reference

```bash
# PASS if extends uses the published package name
grep -q "@narduk-enterprises/narduk-nuxt-template-layer" apps/web/nuxt.config.ts && echo "✅ Published layer" || echo "❌ Not using published layer"
```

```bash
# FAIL if using a relative path
grep -q "../../layers" apps/web/nuxt.config.ts && echo "❌ Still using relative path extends" || echo "✅ No relative path extends"
```

### 3. Canonical runtimeConfig

Verify ALL of these keys exist in `apps/web/nuxt.config.ts`:

```bash
for key in googleServiceAccountKey posthogApiKey gaPropertyId posthogProjectId appUrl appName posthogPublicKey posthogHost gaMeasurementId indexNowKey; do
  grep -q "$key" apps/web/nuxt.config.ts && echo "✅ $key" || echo "❌ Missing: $key"
done
```

### 4. Doppler Project Exists with All Keys

```bash
APP=$(basename $(pwd))
for key in GA_MEASUREMENT_ID SITE_URL INDEXNOW_KEY POSTHOG_PUBLIC_KEY GA_ACCOUNT_ID GSC_SERVICE_ACCOUNT_JSON; do
  val=$(doppler secrets get "$key" --project "$APP" --config prd --plain 2>/dev/null)
  if [ -n "$val" ]; then echo "✅ $key"; else echo "❌ Missing: $key"; fi
done
```

### 5. Quality Gate

```bash
pnpm run quality && echo "✅ Quality passes" || echo "❌ Quality failed"
```

### 6. No Duplicated Layer Files

Check that app doesn't duplicate layer-provided files:

```bash
DUPES=0
for file in "app/composables/useSeo.ts" "app/composables/useSchemaOrg.ts" "app/plugins/gtag.client.ts" "app/plugins/posthog.client.ts" "app/plugins/fetch.client.ts" "server/middleware/csrf.ts" "server/middleware/d1.ts" "server/utils/database.ts" "server/utils/rateLimit.ts" "server/utils/auth.ts" "server/utils/google.ts" "server/utils/kv.ts" "server/utils/r2.ts" "server/api/health.get.ts"; do
  if [ -f "apps/web/$file" ]; then
    echo "❌ Duplicated: apps/web/$file (provided by layer)"
    DUPES=$((DUPES+1))
  fi
done
[ $DUPES -eq 0 ] && echo "✅ No duplicated layer files"
```

### 7. STANDARDIZATION.md Updated

```bash
APP=$(basename $(pwd))
grep -q "$APP.*✅" ~/new-code/narduk-nuxt-template/.agents/app-standardization/STANDARDIZATION.md && echo "✅ Tracking updated" || echo "⚠️ Update STANDARDIZATION.md"
```

### 8. CI/CD Workflow Compliance

Verify `.github/workflows/ci.yml` matches the canonical pattern:

```bash
# Must exist as a single combined file
test -f .github/workflows/ci.yml && echo "✅ ci.yml exists" || echo "❌ Missing .github/workflows/ci.yml"

# Should NOT have a separate deploy.yml
test -f .github/workflows/deploy.yml && echo "❌ Separate deploy.yml found (should be combined in ci.yml)" || echo "✅ No separate deploy.yml"

# Preflight job
grep -q "preflight" .github/workflows/ci.yml && echo "✅ Preflight job" || echo "❌ Missing preflight job"

# Correct Doppler action
grep -q "secrets-fetch-action" .github/workflows/ci.yml && echo "✅ secrets-fetch-action" || echo "❌ Using old doppler cli-action"
grep -q "cli-action" .github/workflows/ci.yml && echo "❌ Still using deprecated dopplerhq/cli-action" || echo "✅ No deprecated cli-action"

# working-directory: apps/web
grep -q "working-directory: apps/web" .github/workflows/ci.yml && echo "✅ working-directory: apps/web" || echo "❌ Missing working-directory: apps/web"

# D1 migrations
grep -q "D1 migrations" .github/workflows/ci.yml && echo "✅ D1 migration step" || echo "❌ Missing D1 migration step"

# Nuxt prepare loop
grep -q "for cfg in" .github/workflows/ci.yml && echo "✅ Nuxt prepare loop" || echo "❌ Missing Nuxt prepare loop (uses bare nuxt prepare)"

# Unit tests
grep -q "test:unit" .github/workflows/ci.yml && echo "✅ Unit test step" || echo "❌ Missing unit test step"
```

### 9. Doppler Hub-Spoke Cross-References

Verify that hub keys are cross-refs (not direct values) and resolve correctly:

```bash
APP=$(basename $(pwd))

# Check that hub keys are cross-refs, not copy-pasted direct values
doppler secrets --project "$APP" --config prd --json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
hub_keys = {
    'CLOUDFLARE_API_TOKEN': 'narduk-nuxt-template',
    'CLOUDFLARE_ACCOUNT_ID': 'narduk-nuxt-template',
    'POSTHOG_PUBLIC_KEY': 'narduk-analytics',
    'POSTHOG_PROJECT_ID': 'narduk-analytics',
    'POSTHOG_HOST': 'narduk-analytics',
    'GA_ACCOUNT_ID': 'narduk-analytics',
    'GSC_SERVICE_ACCOUNT_JSON': 'narduk-analytics',
    'GSC_USER_EMAIL': 'narduk-analytics',
}
for key, expected_hub in hub_keys.items():
    v = data.get(key)
    if not v:
        print(f'❌ {key}: MISSING')
    elif v.get('raw','x') != v.get('computed','y'):
        print(f'✅ {key}: cross-ref (should point to {expected_hub})')
    else:
        print(f'❌ {key}: DIRECT VALUE (should be cross-ref to {expected_hub})')
"

# Verify the cross-refs resolve to real values (not empty)
for key in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID POSTHOG_PUBLIC_KEY GA_ACCOUNT_ID; do
  val=$(doppler secrets get "$key" --project "$APP" --config prd --plain 2>/dev/null)
  if [ -n "$val" ]; then echo "✅ $key resolves"; else echo "❌ $key resolves to EMPTY (wrong hub target?)"; fi
done
```

---

## Summary

After running all checks, report the scorecard:

```
Standardization Check: <app-name>
═══════════════════════════════════
1. Structure:       ✅/❌
2. Layer:           ✅/❌
3. runtimeConfig:   ✅/❌
4. Doppler Keys:    ✅/❌
5. Quality:         ✅/❌
6. No Dupes:        ✅/❌
7. Tracking:        ✅/❌
8. CI/CD:           ✅/❌
9. Hub-Spoke:       ✅/❌
Score: X/9
```

If score is 9/9, update `STANDARDIZATION.md` with all ✅. Otherwise, fix the
failures and re-run.
