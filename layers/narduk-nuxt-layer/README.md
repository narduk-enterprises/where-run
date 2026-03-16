# Narduk Nuxt Layer

> **⚠️ ARCHITECTURE NOTICE:** This is a **Nuxt Layer**. You do not build
> applications directly inside this directory. Instead, downstream applications
> (like `apps/web/` or `apps/example-*/`) use
> `extends: ['@narduk-enterprises/narduk-nuxt-template-layer']` to inherit these
> shared resources.

This is the centralized source of truth for **Nuxt 4**, the aesthetics of **Nuxt
UI 4 (Tailwind CSS 4)**, and our global integrations for **Cloudflare Workers**
and **D1 SQLite databases**.

## What This Layer Provides

| Category                | Files                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Composables**         | `useSeo`, `useSchemaOrg` (includes `useWebPageSchema`, `useArticleSchema`, `useProductSchema`)                         |
| **Plugins**             | `gtag.client.ts`, `posthog.client.ts`, `fetch.client.ts` (CSRF header injection)                                       |
| **Server Middleware**   | `cors.ts`, `csrf.ts`, `d1.ts` (database binding), `indexnow.ts`, `securityHeaders.ts`                                  |
| **Server Utils**        | `database.ts`, `rateLimit.ts`, `auth.ts` (includes `requireAdmin`), `kv.ts`, `r2.ts`, `google.ts`                      |
| **Server API Routes**   | `/api/health`, `/api/indexnow/submit`, `/api/admin/indexing/*`, `/api/admin/ga/overview`, `/api/admin/gsc/performance` |
| **Database Schema**     | Base schema in `server/database/schema.ts`                                                                             |
| **CSS / Design Tokens** | `main.css` with `@theme` tokens, utility classes (`.glass`, `.card-base`, etc.)                                        |
| **Types**               | Shared TypeScript interfaces in `app/types/`                                                                           |

### Documentation

Please refer to the [Workspace Root README](../../README.md) and
[Global Agent Instructions](../../AGENTS.md) for full architectural constraints,
database setup instructions, and Cloudflare Worker requirements.
