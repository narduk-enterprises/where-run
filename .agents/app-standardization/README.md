# App Standardization Infrastructure

> **Temporary folder.** Delete when all apps are standardized:
> `rm -rf .agents/app-standardization/`

## Contents

| File                        | Purpose                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `STANDARDIZATION.md`        | Master tracking checklist — app status matrix, canonical config, Doppler cheat sheet, migration log |
| `standardize-app.md`        | Agent workflow — detects tier, runs appropriate steps, updates tracking                             |
| `check-standardization.md`  | Post-migration 7-point verification checklist                                                       |
| `audit-fleet.ts`            | Script that queries all Doppler projects and reports fleet-wide status                              |
| `check-template-drift.ts`   | Compares any app's infra files against template, reports drift with fix commands                    |
| `analytics-architecture.md` | Entity hierarchy, Doppler architecture, integration flows, troubleshooting                          |

## Slash Commands

These are wired as aliases in `.agents/workflows/`:

- `/standardize-app` — Run the standardization workflow for a single app
- `/check-standardization` — Verify an app meets all standardization
  requirements

## Quick Start

```bash
# See fleet-wide status
tsx .agents/app-standardization/audit-fleet.ts

# Check a specific app's infra drift against the template
tsx .agents/app-standardization/check-template-drift.ts ~/new-code/<app-name>

# Standardize an app (agent workflow)
# Use /standardize-app in conversation

# Verify after migration
# Use /check-standardization in conversation
```
