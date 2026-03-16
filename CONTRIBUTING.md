# Contributing

Welcome! This guide helps you get up and running with the **Nuxt 4 + Nuxt UI 4
Edge Template** monorepo.

## Prerequisites

- **Node.js 22+** (pinned via Volta — install [Volta](https://volta.sh/) and
  it's automatic)
- **pnpm** (install globally: `npm i -g pnpm`)
- **Doppler CLI** (for secrets management:
  [Install Guide](https://docs.doppler.com/docs/install-cli))

## Quick Start

```bash
git clone https://github.com/narduk-enterprises/where-run.git my-project
cd my-project
pnpm install
pnpm run dev          # Starts apps/web with hot reload
```

## Project Structure

```
apps/           → Nuxt 4 applications (web, showcase, examples)
layers/         → Shared Nuxt Layer (consumed via workspace:*)
packages/       → Workspace packages (eslint-config)
tools/          → Init, validate, and setup scripts
.agents/        → AI agent workflows
```

## Common Commands

| Command                 | What It Does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm run dev`          | Start the main web app                                            |
| `pnpm run dev:showcase` | Start all showcase apps concurrently                              |
| `pnpm run lint`         | Lint all packages (auto-builds ESLint plugins)                    |
| `pnpm run typecheck`    | TypeScript type checking across all packages                      |
| `pnpm run quality`      | Lint + typecheck combined                                         |
| `pnpm run build`        | Production build (requires Doppler)                               |
| `pnpm run setup`        | Initialize a new project (prefer the control plane provision API) |
| `pnpm run validate`     | Run project validation checks                                     |

## Development Workflow

1. **Pick an app** — Work in `apps/web/` for the main app, or create a new
   example under `apps/example-<name>/`.
2. **Layer changes** — If you need to edit shared code, modify files in
   `layers/narduk-nuxt-layer/`. Changes are live-reloaded.
3. **ESLint plugins** — After modifying plugins in `packages/eslint-config/`,
   rebuild with `pnpm run build:plugins`.
4. **Commit often** — Use
   [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
   `fix:`, `refactor:`, `chore:`).

## Secrets Management

This project uses **Doppler** — never create `.env` files. All example apps
share a single Doppler project:

| Doppler Project | Config     | Used By        |
| --------------- | ---------- | -------------- |
| `where-run`     | `dev`      | Shared secrets |
| `where-run`     | `dev_auth` | `example-auth` |

**First-time setup for example-auth:**

```bash
cd apps/example-auth
doppler setup --project where-run --config dev_auth --no-interactive
```

See the
[Secrets recipe in AGENTS.md](./AGENTS.md#-recipe-secrets--environment-doppler)
for full details.

## Testing

- **Unit tests:** `pnpm -r test:unit` (Vitest)
- **E2E tests:** `pnpm test:e2e` (Playwright)
- **Per-app E2E:** `pnpm test:e2e:auth`, `pnpm test:e2e:blog`, etc.

## Hard Constraints

- **No Node.js modules** in server code (Cloudflare Workers V8 isolates)
- **Web Crypto API** only — no `bcrypt`, no Node `crypto`
- **Drizzle ORM** only — no Prisma
- **pnpm** only — never use `npm` or `yarn`

## Need Help?

Read **[AGENTS.md](./AGENTS.md)** for complete architectural rules, recipes, and
quality workflows.
