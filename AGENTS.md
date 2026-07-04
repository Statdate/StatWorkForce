<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stat Workforce — project context

Hospital workforce management SaaS: scheduling, timekeeping, credential
tracking. One Next.js codebase (frontend + API routes) plus a sibling Expo
mobile app in `mobile/`. Full architecture rationale and stack are in
[README.md](README.md) — read that first. This section is conventions +
current state that aren't in the README's mostly-append-only changelog.

## Local dev

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET, CRON_SECRET
npm run db:migrate
npm run db:seed        # test accounts: see README's "Seeded test logins"
npm run dev            # http://localhost:3000
```

Mobile (needs the web backend running):

```bash
cd mobile && npm install && npm run web   # or: npm run ios
```

Before any `tsc`/build after touching `mobile/`, and before touching
`prisma/schema.prisma`, see "Known local quirks" below.

## Core conventions (load-bearing — don't deviate without a reason)

- **DAL is the only source of truth for auth**, not the proxy. `src/proxy.ts`
  (Next 16 renamed `middleware` → `proxy`) does a fast cookie-only redirect
  gate; every Server Component/Action/Route Handler re-verifies via
  `src/lib/dal.ts` (`getCurrentUser()` web, `getApiUser()` mobile — returns
  null instead of redirecting, since a 302 makes no sense for a JSON API).
  **Known gap:** `src/proxy.ts`'s `ROLE_PREFIXES` gates `/manager/*` to
  `accountType === "MANAGER"` exactly — an ADMIN account gets redirected to
  `/unauthorized` if it tries to open a manager's dashboard directly. Not
  fixed as of the last session; ask before changing if it comes up.
- **Core-logic split pattern**: every user-facing data function has two
  forms — `doThing()` (web-only, calls `getCurrentUser()`/`requireRole()`
  itself) and `doThingForUser(user, ...)` / `doThingAsUser(user, ...)` (takes
  an already-resolved user). Mobile API routes always call the `ForUser`/
  `AsUser` variant with `getApiUser()`'s result, since they can't use
  cookie-based redirects. Grep `src/lib/data/*.ts` for examples before adding
  a new one — don't invent a third pattern.
- **Manager aggregation pattern**: web manager pages are nested under
  `/manager/[unitId]/...` and historically only queried that one unit.
  Mobile has no per-unit navigation, so newer functions (`getUnitScheduleForManager`,
  `getUnitCredentialsForManager`, `getUnitTimeOffRequestsForManager`, all in
  `src/lib/data/manager.ts`) take an optional `unitIds?: string[]` and default
  to *every* unit the manager/admin is scoped to (via a local
  `allScopedUnitIds(user)` helper — admins are unscoped, so it falls back to
  every unit in the hospital). Web's single-unit pages now call these with
  an explicit `[unitId]` array; prefer extending these shared functions over
  writing a new single-unit query.
- **Production data fixes go through idempotent, CRON_SECRET-gated one-time
  API routes** (`src/app/api/admin/sync-seed-identities`,
  `src/app/api/admin/sync-org-structure`), never direct DB access. Every
  write in them is an upsert or a no-op-if-already-applied delete, so they're
  safe to call more than once. Extend an existing route for a new one-time
  fix rather than writing a fresh script, so it stays re-callable. Call with
  `curl -X POST <url> -H "Authorization: Bearer $CRON_SECRET"`.
- **Shared `ManagerNav` component** (`src/components/manager-nav.tsx`) is the
  nav for every `/manager/[unitId]/*` page (Dashboard/Credentials/Time
  off/Messages/Alerts). Don't hand-roll a nav `<div>` in a new manager page —
  a prior version of the Messages pages did this and ended up with *no* nav
  at all, stranding managers with no way back to Credentials.
- **Role-aware mobile screens**: mobile has no route-level role gating (no
  proxy equivalent). Shared tab screens (`mobile/src/app/(app)/index.tsx`,
  `time-off.tsx`, `credentials.tsx`) branch internally on
  `useAuth().user?.accountType` and render an entirely different component
  for `WORKER` vs `MANAGER`/`ADMIN` (e.g. `WorkerScheduleView` vs
  `ManagerUnitScheduleView`) rather than conditionally hiding pieces of one
  component.

## Known local quirks

- **Prisma client staleness**: after editing `prisma/schema.prisma` and
  running `npx prisma generate`, an already-running `next dev` process holds
  a stale generated client (`PrismaClientValidationError: Unknown field`).
  Restart the dev server, don't just regenerate.
- **Stray `.next/types/*` duplicate files** cause spurious `tsc` errors
  unrelated to your change (e.g. `cache-life.d 2.ts`). Fix:
  `rm -f ".next/types/cache-life.d 2.ts" ".next/types/routes.d 2.ts" ".next/types/validator 2.ts"`
  before re-running `tsc --noEmit`.
- **`npm run build` while a dev server is also running against the same
  local DB** throws Postgres prepared-statement errors (`08P01`). Stop the
  dev server first.
- Local dev uses `npx prisma dev`'s connection proxy, which can't handle many
  concurrent Prisma calls from a standalone script (e.g. `prisma/seed.ts`,
  which has its own `PrismaClient` separate from the app's shared instance).
  Use sequential `for` loops, not `Promise.all`, for large seed batches.

## Deploy

Render (GitHub-connected, auto-deploys on push to `main`). Production URL:
`https://statworkforce.onrender.com`. `CRON_SECRET` on Render is set
independently of local `.env` — get it from the Render dashboard
(service → Environment tab) if you need to call a `sync-*` admin route
against production.
