# Fleet Apps Auth Integration Review

Review of `~/new-code/template-apps` for auth integration issues with the shared
layer (nuxt-auth-utils as primary session). Findings below.

---

## 1. Layer drift (all fleet apps)

**Finding:** Every fleet app ships a **vendored copy** of the layer under
`layers/narduk-nuxt-layer/`. Those copies are **older** than the template’s
current auth:

- Layer auth still uses **D1 session first** (`getSessionUser`), then API key —
  not `getUserSession` (nuxt-auth-utils) first.
- Layer `useAuth()` still uses `useFetch('/api/auth/me')` instead of wrapping
  `useUserSession()`.
- Layer auth API routes still use `createSession` / `getSessionUser` /
  `destroySession` instead of `setUserSession` / `getUserSession` /
  `clearUserSession`.
- Layer `tests/server/auth.test.ts` does **not** stub `getUserSession`, so after
  pulling the updated template layer those tests would fail without the stub.

**Action:** Each app should run **`pnpm run update-layer`** (or equivalent) so
the layer is replaced with the template’s current version. Until then, fleet
apps are on the old dual-auth behaviour and will not benefit from the
nuxt-auth-utils fix.

---

## 2. ai-media-gen — critical auth issues

**Location:** `apps/web/`

### 2.1 Wrong password API (runtime break)

- **File:** `server/utils/auth.ts`
- **Issue:** Calls `hashPassword(password)` and
  `verifyPassword(password, stored)`.
- **Reality:** The layer only exports `hashUserPassword` and
  `verifyUserPassword`. Nitro does not auto-import
  `hashPassword`/`verifyPassword` (layer excludes nuxt-auth-utils password
  module).
- **Effect:** Any code path that creates or verifies users (e.g. registration,
  login if ever used from this util) will throw
  **`hashPassword is not defined`** / **`verifyPassword is not defined`** at
  runtime.

**Fix:** Use layer names everywhere:

- `hashPassword` → `hashUserPassword`
- `verifyPassword` → `verifyUserPassword`

(No aliases; template policy is app compliance.)

### 2.2 Custom auth middleware and cookie name

- **File:** `server/middleware/03.auth.ts`
- **Issue:** Reads `getCookie(event, 'session')` and resolves the user via
  `getSessionWithUser(event, sessionId)` (D1), then sets
  `event.context._authUser`.
- **Reality:** The layer’s auth is built on **nuxt-auth-utils** (sealed cookie),
  not a `session` cookie or D1 session ID. Login/register in the layer call
  `setUserSession(event, { user })` and do not set a `session` cookie.
- **Effect:** Even after a successful login via the layer’s `/api/auth/login`,
  `03.auth.ts` never sees a `session` cookie, so `_authUser` stays `null`. Route
  protection and SSR auth state that rely on `_authUser` will think the user is
  logged out.

**Fix:** Remove the custom auth middleware and rely on the layer:

- Delete or disable `server/middleware/03.auth.ts`.
- Rely on the layer’s auth middleware and `useUserSession()` / `useAuth()` for
  route guards and client/SSR state. No need to set `_authUser` manually.

### 2.3 Redundant auth server plugin

- **File:** `app/plugins/auth.server.ts`
- **Issue:** Reads `event.context._authUser` and sets
  `useState('auth-user', () => authUser)` so “useAuth’s useState” has the user
  for SSR.
- **Reality:** The layer’s `useAuth()` now wraps **`useUserSession()`** from
  nuxt-auth-utils. Session state is owned by nuxt-auth-utils, not `auth-user`.
  The plugin was for the old custom D1 + `_authUser` bridge.
- **Effect:** After removing the custom middleware, `_authUser` is never set, so
  this plugin only ever sets `null`. It can also confuse where “logged in” state
  comes from.

**Fix:** Remove `app/plugins/auth.server.ts`. Auth state should come only from
`useUserSession()` / layer `useAuth()`.

### 2.4 API routes using `event.context._authUser`

- **Example:** `server/api/generate/stream.get.ts` uses
  `event.context._authUser`.
- **Issue:** With the above changes, `_authUser` will no longer be set. Any
  route that only checks `_authUser` will treat all requests as unauthenticated.
- **Fix:** Use the layer’s **`requireAuth(event)`** (or `requireAdmin(event)`
  where appropriate) in API handlers. That uses nuxt-auth-utils session + API
  key and returns the current user; do not rely on `_authUser`.

### 2.5 API keys / schema

- **Finding:** `apps/web` schema and migrations do not define an `api_keys`
  table. The layer’s API key routes (e.g. `/api/auth/api-keys`) expect that
  table.
- **Effect:** If the app (or a future feature) uses those routes, they will fail
  at runtime.
- **Fix:** Either add the layer’s `api_keys` migration (e.g.
  `0002_api_keys.sql`) to the app’s migrations, or avoid using the API key
  routes in this app.

---

## 3. papa-everetts-pizza — custom auth vs layer

**Finding:** This app has **two** auth systems:

1. **Root `server/`** (custom): `server/api/auth/login.post.ts`,
   `signup.post.ts`, `me.get.ts`, `logout.post.ts` use a **custom**
   `createSession(userId)`, `setCookie(event, 'session', sessionId)`, and D1
   sessions. So login/signup set a **`session`** cookie (D1 session ID).
2. **Layer:** `apps/web` uses `requireAuth(event)` (from the layer) in
   `server/utils/auth-guards.ts` and `useAuth()` in admin pages. The vendored
   layer’s `requireAuth` uses **`getSessionUser(event)`**, which reads the
   **`app_session`** cookie (layer’s D1 session), not `session`.

So:

- Custom login sets **`session`**.
- Layer `requireAuth` reads **`app_session`** (and, after update-layer, would
  read nuxt-auth-utils sealed session).
- The two never match. After a custom login, layer-protected API routes (e.g.
  admin) will still return 401 unless the app’s login also calls the layer’s
  session API.

**Additional:** Root `server/utils/auth.ts` defines its own `hashPassword` /
`verifyPassword` and `createSession` / `verifyCredentials` and is used by root
`server/api/auth/*`. So root auth is self-contained; the mismatch is only when
**apps/web** code calls **layer** `requireAuth` and expects the same session as
the root auth UI.

**Fix (choose one):**

- **Option A:** Migrate to layer-only auth: remove root `server/api/auth/*` (or
  redirect to layer routes), make login/signup call the layer’s auth API (or use
  layer pages), and ensure `runtimeConfig.session.password` is set (min 32
  chars) so nuxt-auth-utils works. Then run `update-layer` and rely on
  `requireAuth` / `useUserSession` / `useAuth()`.
- **Option B:** Keep custom auth but make it compatible with the layer: after a
  successful login/signup in root auth, also call
  **`setUserSession(event, { user })`** (nuxt-auth-utils) with the same user so
  that layer `requireAuth` and `useUserSession()` see the user. Cookie name and
  D1 session can stay for your own logic, but the layer’s `requireAuth` will
  then see the sealed session.

---

## 4. enigma-box — own auth implementation

**Finding:** `apps/web/server/utils/auth.ts` implements its own
**`hashPassword`** / **`verifyPassword`** and session logic (e.g.
`SESSION_COOKIE = 'enigma_session'`). It does **not** call the layer’s password
or session APIs.

**Effect:** Auth is self-contained and does not depend on the layer’s auth. No
change required for the layer’s nuxt-auth-utils migration. If the app ever
switches to layer auth, it would need to stop using its own cookie and use the
layer’s session and names (`hashUserPassword` / `verifyUserPassword` if it still
needs to hash/verify locally).

---

## 5. tiny-invoice — own password util

**Finding:** `apps/web/server/utils/password.ts` defines **`hashPassword`** and
**`verifyPassword`** locally (PBKDF2, same idea as the layer).

**Effect:** If auth routes and middlewares use only this file, they do not
depend on the layer’s password exports. No change required for layer compliance.
If any code were to call the layer’s `hashUserPassword` / `verifyUserPassword`
by name, that would be consistent with the template; the local names are fine as
long as they are not mixed with layer expectations.

---

## 6. control-plane — layer-only auth + change-password

**Finding:** Uses the layer’s **`requireAdmin(event)`** in fleet API routes. No
custom auth middleware or custom cookie. Layer includes an app-specific
**`server/api/auth/change-password.post.ts`** that uses **`requireAuth`**.

**Effect:** Once the app runs **`update-layer`**, it will get the new auth
(nuxt-auth-utils first, then API key). No app code changes needed for the core
auth switch. Ensure `runtimeConfig.session.password` is set (≥32 chars) for
nuxt-auth-utils.

---

## 7. flashcard-pro, tide-check, austin-texas-net, etc.

**Finding:** These use the layer’s **`useAuth()`** and/or **`useUserSession()`**
and **middleware: 'auth'**. They do not introduce custom session cookies or
custom auth middleware in app code.

**Effect:** After **`update-layer`**, they will get the fixed layer
(nuxt-auth-utils, updated `useAuth()`). No app-level auth code changes required.
Again, ensure each app has **`runtimeConfig.session.password`** (or
`NUXT_SESSION_PASSWORD`) set to at least 32 characters so sealed sessions work.

---

## 8. Session password (nuxt-auth-utils)

**Finding:** Many apps’ `nuxt.config.ts` do not set
**`runtimeConfig.session.password`** (or only set it to `''`). nuxt-auth-utils
requires a session password of **at least 32 characters** for sealed cookie
encryption; otherwise login/register can throw.

**Action:** For each app that uses the layer’s auth (login/register/session):

- Set **`runtimeConfig.session.password`** from
  **`process.env.NUXT_SESSION_PASSWORD`** (or a dev-only default of ≥32 chars,
  e.g. only when `import.meta.dev`), and
- Ensure production and CI use **`NUXT_SESSION_PASSWORD`** with a strong value
  (≥32 chars).

Example (as in example-auth):

```ts
session: {
  password:
    process.env.NUXT_SESSION_PASSWORD ||
    (import.meta.dev ? 'your-app-dev-session-secret-min-32-chars' : ''),
  // ...
},
```

---

## 9. Layer auth tests in fleet repos

**Finding:** Each fleet app’s **vendored** layer contains
`tests/server/auth.test.ts` that expects **`requireAuth`** / **`requireAdmin`**
to throw when there is no session, and currently do **not** stub
**`getUserSession`**.

**Effect:** After **`update-layer`**, the new layer code will call
**`getUserSession(event)`** first. In Vitest, that is not auto-injected, so
tests would fail with **`getUserSession is not defined`** unless the test file
stubs it. The **template** layer already adds
**`vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue(null))`** in that
test file.

**Action:** No app-level change needed; **`update-layer`** will bring in the
template’s auth test with the stub. If an app has custom auth tests that assume
D1 session or `getSessionUser`, those may need to be updated to stub
`getUserSession` (and optionally API key) as needed.

---

## 10. Other findings (non-auth)

- **Typecheck/artifact files:** `ai-media-gen/apps/web/typecheck2.txt` and
  `ai-media-gen/apps/web/typecheck-results.txt` contain errors (e.g.
  `getSessionWithUser` not found, module `../utils/auth` not found). These look
  like past typecheck logs; they reinforce that `server/utils/auth.ts` and
  middleware imports should be updated/removed as above, and such artifact files
  could be gitignored or removed.
- **Duplicate structure (papa-everetts-pizza):** There is both a root
  **`server/`** and **`apps/web/server/`**, and root **`app/`** and
  **`apps/web/app/`**. Worth confirming which server and app roots are used when
  running `pnpm --filter web dev` so that auth and routes are clearly assigned
  to one place.

---

## Summary table

| App                     | Auth integration issues                                                          | Action                                                                              |
| ----------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **ai-media-gen**        | Wrong password names; custom middleware + plugin; `_authUser` usage; no api_keys | Fix names; remove 03.auth + plugin; use requireAuth in APIs; add api_keys if needed |
| **papa-everetts-pizza** | Custom auth sets `session`; layer requireAuth uses app_session / nuxt-auth-utils | Unify: either migrate to layer auth or call setUserSession after custom login       |
| **enigma-box**          | Migrated to layer auth; puzzle answer hashing in `server/utils/puzzle.ts` only   | Done (see fixes applied)                                                            |
| **tiny-invoice**        | Own password util; uses layer useAuth                                            | None; ensure session.password set                                                   |
| **control-plane**       | Layer-only; has change-password in layer                                         | update-layer; session.password                                                      |
| **All others**          | Layer-only auth; vendored layer is old                                           | update-layer; session.password                                                      |

**Recommended order:** Run **`pnpm run update-layer`** in each app, then fix
**ai-media-gen** and **papa-everetts-pizza** as above, then add or verify
**session.password** (and NUXT_SESSION_PASSWORD) everywhere that uses auth.

---

## Fixes applied (2026-03-06)

- **ai-media-gen:** `server/utils/auth.ts` now imports and uses
  `hashUserPassword` / `verifyUserPassword` from the layer; removed
  `server/middleware/03.auth.ts` and `app/plugins/auth.server.ts`;
  `server/api/generate/stream.get.ts` now uses `requireAuth(event)` instead of
  `_authUser`. Added `runtimeConfig.session.password` with dev default.
- **papa-everetts-pizza:** Root `server/api/auth/login.post.ts` and
  `signup.post.ts` now call `setUserSession(event, { user })` after setting the
  custom cookie so layer `requireAuth` / `useUserSession` see the same user.
  Added `runtimeConfig.session.password` in `apps/web/nuxt.config.ts`.
- **enigma-box:** Migrated to layer auth for consistency. Removed
  `apps/web/server/utils/auth.ts` (custom `enigma_session` cookie,
  hashPassword/verifyPassword,
  createSession/getSessionUser/destroySession/requireAuth). Added
  `apps/web/server/utils/puzzle.ts` with game-specific
  `hashAnswer`/`verifyAnswer` only (SHA-256 of normalized puzzle answers). Admin
  and verify routes now use `requireAuth` from `#layer/server/utils/auth` and
  answer helpers from `#server/utils/puzzle`. Login/register/me/logout are
  provided by the layer; after `update-layer`, session will use nuxt-auth-utils.
  Updated `tools/seed-enigma.ts` comment to reference `puzzle.ts`.
- **All fleet apps (20):** Added `runtimeConfig.session.password` (from
  `NUXT_SESSION_PASSWORD` or a dev-only default ≥32 chars) in each app’s
  `apps/web/nuxt.config.ts`: ai-media-gen, papa-everetts-pizza, control-plane,
  flashcard-pro, tide-check, tiny-invoice, enigma-box, austin-texas-net,
  neon-sewer-raid, favicon-checker, ogpreview-app, old-austin-grouch,
  narduk-enterprises-portfolio, imessage-dictionary, nagolnagemluapleira,
  video-grab, sailing-passage-map, drift-map, clawdle, circuit-breaker-online.

---

## Re-review findings & fixes (2026-03-06, pass 2)

### Template issues found

1. **No rate limiting on auth endpoints (CRITICAL):** Layer `login.post.ts`,
   `register.post.ts`, `api-keys.post.ts`, `api-keys/[id].delete.ts` had zero
   `enforceRateLimit` calls — violating AGENTS.md policy.
2. **`login-test.post.ts` unrestricted (HIGH):** Passwordless demo login in
   `example-auth` had no `import.meta.dev` guard — accessible in production.
3. **`useAuthApi.changePassword` dead reference (MEDIUM):** `useAuthApi`
   composable called `/api/auth/change-password` but no such route existed in
   the layer.

### Fleet app issues found

4. **All 20 fleet apps stale (CRITICAL):** Every vendored layer still uses OLD
   D1-session-first auth (`getSessionUser` / `createSession` /
   `destroySession`), not nuxt-auth-utils (`getUserSession` / `setUserSession` /
   `clearUserSession`).
5. **papa-everetts-pizza timing-unsafe password verification (HIGH):**
   `verifyPassword` used plain `===` comparison instead of constant-time XOR
   loop.
6. **papa-everetts-pizza logout incomplete (HIGH):** `logout.post.ts` cleared
   custom `session` cookie and D1 row but never called
   `clearUserSession(event)`, leaving nuxt-auth-utils sealed cookie active after
   logout.
7. **ai-media-gen dead custom auth utils (MEDIUM):**
   `apps/web/server/utils/auth.ts` had custom `getUserByEmail`, `createUser`,
   `verifyCredentials`, `getSessionWithUser`, `deleteSession` — all unreferenced
   dead code after prior fixes.
8. **tiny-invoice own password.ts (OK):** Has `constantTimeEqual` — timing-safe,
   no fix needed.

### Fixes applied (pass 2)

- **Template `login.post.ts`:** Added
  `await enforceRateLimit(event, 'auth-login', 10, 60_000)` — 10 requests/minute
  per IP.
- **Template `register.post.ts`:** Added
  `await enforceRateLimit(event, 'auth-register', 5, 60_000)` — 5
  requests/minute per IP.
- **Template `api-keys.post.ts`:** Added
  `await enforceRateLimit(event, 'auth-api-keys', 10, 60_000)`.
- **Template `api-keys/[id].delete.ts`:** Added
  `await enforceRateLimit(event, 'auth-api-keys', 10, 60_000)`.
- **Template `change-password.post.ts`:** Created new layer endpoint at
  `server/api/auth/change-password.post.ts` with `requireAuth`, Zod validation
  (`currentPassword` min 1, `newPassword` min 8), rate limiting (5/min), and
  `verifyUserPassword` / `hashUserPassword`. Resolves the
  `useAuthApi.changePassword` dead reference.
- **example-auth `login.post.ts`:** Added
  `await enforceRateLimit(event, 'auth-login', 10, 60_000)`.
- **example-auth `login-test.post.ts`:** Added `import.meta.dev` guard (returns
  404 in production) and rate limiting (5/min).
- **papa-everetts-pizza `server/utils/auth.ts`:** Replaced
  `return toHex(hash) === hashHex` with constant-time XOR comparison loop
  (`diff |= a.charCodeAt(i) ^ b.charCodeAt(i)`).
- **papa-everetts-pizza `server/api/auth/logout.post.ts`:** Added
  `await clearUserSession(event)` after clearing the custom session cookie and
  D1 row.
- **ai-media-gen:** Deleted `apps/web/server/utils/auth.ts` (dead code — no
  imports from other files).

### Remaining action items

- **All 20 fleet apps** need `pnpm run update-layer` to get the nuxt-auth-utils
  migration + rate-limited auth endpoints + change-password endpoint.
- **papa-everetts-pizza** should consider migrating to layer-only auth long-term
  (dual session architecture increases attack surface).
- **control-plane** layer copy already had `change-password.post.ts`; after
  `update-layer` it will get the canonical version from the template.
