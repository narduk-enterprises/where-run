# GitHub Copilot Instructions

Read `AGENTS.md` at the project root for full project rules and conventions.

## Architecture & Monorepo

- **PNPM Workspace**: The main application lives in `apps/web/`.
- **Shared Layer**: `layers/narduk-nuxt-layer/` provides standard modules (Nuxt
  UI 4, SEO, Auth), security middleware, and styling. **Do NOT recreate** what
  the layer already provides.
- **Example Apps**: Reference `apps/showcase/` or `apps/example-*/` for working
  implementations.

## Key Rules & Constraints

- **Environment**: Nuxt 4 + Nuxt UI 4 deployed to **Cloudflare Workers** using
  D1 (SQLite) and Drizzle ORM.
- **NO Node.js**: Cloudflare Workers isolates do not support Node built-ins
  (`fs`, `crypto`, `path`). Use the Web Crypto API.
- **Nuxt 4 Structure**: All frontend code must go in `app/` (e.g.,
  `app/components/`, `app/pages/`).
- **Nuxt UI 4**: Use `USeparator` instead of `UDivider`. Icons use the `i-`
  prefix (e.g., `i-lucide-home`).
- **Tailwind v4**: Configured via `@theme` variables in `main.css`, not a
  `tailwind.config` file.
- **Data Fetching**: Always use `useAsyncData` or `useFetch`. **Never** use raw
  `$fetch` in `<script setup>` to prevent request waterfalls and N+1 queries.
- **State Management**: Use `useState()` or Pinia. **Never** use bare `ref()` or
  reactive state at the module scope (causes cross-request leaks).
- **SSR/Hydration Safety**: Wrap any `window` or `document` access inside
  `onMounted` or `<ClientOnly>`.
- **SEO**: Every page component must call `useSeo()` and a `useSchemaOrg()`
  helper (e.g., `useWebPageSchema()`).
- **Pattern**: Thin Components, Thick Composables. Keep complex logic out of
  `.vue` files.

## Build & Quality Pipeline

1. Run `pnpm run build:plugins` first to compile workspace-local ESLint plugins.
2. Run `pnpm run quality` for full linting and typechecking. Fix all errors.

## Start & Automations

- **CRITICAL**: If starting a new project, run `pnpm setup` first. Verify
  `git remote -v` does NOT point to `narduk-enterprises/where-run`.
- **Secrets**: Use Doppler. Secrets are consumed via `process.env.SECRET_NAME`
  in `nuxt.config.ts`.
- Run `/check-*` and `/audit-*` AI workflows (in `.agents/workflows/`) for
  extensive codebase audits.
