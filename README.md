# Stat Workforce

Hospital workforce management — scheduling, timekeeping, and credential
tracking for hospital units.

## Architecture decision: one app, four pillars

This is a **single Next.js codebase** (App Router, frontend + API routes
together), not separate apps per feature. Scheduling is the core; timekeeping
and credential tracking are modules on the same data model and the same auth
system, not separate products. Reasons:

- A shift, a punch, and a credential all hang off the same `User` and `Unit`.
  Splitting them into services would mean syncing identity and org structure
  across services for no real benefit at this stage.
- Manager/worker/admin scoping rules (who can see what) are enforced once, in
  one data access layer, instead of being re-implemented per service.
- One deploy target (Render web service + managed Postgres) is simpler to
  operate for a small team than a service mesh.

If a pillar (e.g. IVR-based timekeeping) later needs infrastructure that
doesn't fit a Next.js server (long-running telephony workers, for example),
that piece can be pulled out into its own service that reads/writes the same
Postgres database — the schema is already modular enough for that.

## Stack

- **Next.js 16** (App Router, Turbopack) — frontend + API/server actions in
  one codebase
- **PostgreSQL** via **Prisma 7** (using the `prisma-client` generator +
  `@prisma/adapter-pg` driver adapter — Prisma 7 requires an explicit driver
  adapter rather than a schema-embedded connection string; see
  [`src/lib/prisma.ts`](src/lib/prisma.ts))
- **Tailwind CSS 4**
- Custom cookie/JWT session auth (`jose` + `bcryptjs`) — no third-party auth
  provider, per the spec's "simple JWT/session setup" option
- Deploy target: **Render** (web service + managed Postgres), GitHub-connected
  for auto-deploy on push

### Why not NextAuth?

Badge-number + password login on shared hospital terminals doesn't map
cleanly onto NextAuth's OAuth-first credential provider model, and the spec
explicitly allowed "a simple JWT/session setup." The session implementation
here follows the Next.js team's own recommended pattern for this
(`src/lib/session.ts` + `src/lib/dal.ts`) — a signed, httpOnly JWT cookie plus
a cached `verifySession()`/`getCurrentUser()` pair that every Server
Component, Server Action, and Route Handler calls before touching data.

## Getting started

### Prerequisites

- Node.js 20.9+
- A PostgreSQL database (local Postgres, Postgres.app, Docker, or a Render
  managed Postgres instance)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — your Postgres connection string
- `SESSION_SECRET` — generate one with `openssl rand -base64 32`

### 3. Create the schema and seed sample data

```bash
npm run db:migrate   # creates tables from prisma/schema.prisma
npm run db:seed      # loads a sample hospital, units, and test users
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to
`/login`.

### Seeded test logins

All seeded users share the password `Password123!`.

| Role    | Badge number | Notes                          |
| ------- | ------------ | ------------------------------- |
| Admin   | `10001`      | Sees the whole hospital          |
| Manager | `20001`      | Scoped to the ICU unit           |
| Worker  | `30001`      | ICU, has an expired BLS cert     |
| Worker  | `30002`      | ICU                              |
| Worker  | `30003`      | ICU, reported the sample call-in |
| Worker  | `30004`      | Emergency Department (different unit — proves manager scoping) |

### Other scripts

```bash
npm run build       # production build + typecheck
npm run lint         # eslint
npm run db:studio    # Prisma Studio, browse the DB visually
npm run db:push      # push schema changes without a migration (prototyping)
```

## Verified so far in this environment

The sandbox this was built in has no system Postgres, Docker, or Homebrew, so
a temporary local database was spun up with `npx prisma dev` purely to
smoke-test the app end to end before handing it off; that instance was torn
down afterward and isn't part of the repo. Confirmed working:

- `npx tsc --noEmit` and `npm run lint` — clean
- `npm run build` — production build succeeds
- The generated `prisma/migrations/*/migration.sql` applies cleanly to a
  fresh Postgres and creates all 15 tables
- `npm run db:seed` runs successfully against a freshly migrated database
- Logged in as all three seeded roles (admin `10001`, manager `20001`, worker
  `30001`) through the actual login form and confirmed each dashboard renders
  real data: admin sees all 7 units + the open call-in; manager sees the ICU
  census correctly flagging understaffed vs. balanced shifts, the pending
  timecard, and the unit's staff; worker sees their 5 upcoming shifts and
  their credentials with correct "Expired" / "Expiring soon" status labels
- `/`, `/admin`, `/manager`, `/worker` correctly redirect to `/login` when
  unauthenticated (proxy-level route protection confirmed)
- Sign-out clears the session and returns to `/login`

One real bug was caught and fixed during this pass: `prisma/seed.ts` used
`Date.setHours()` (which returns a number, not a `Date`) when building shift
times — fixed via a `shiftTimeOnDay()` helper that returns a proper `Date`.

Not yet exercised: self-scheduling/sign-up flows, timecard approval actions,
message sending, and credential upload — none of those have interactive
server actions wired up yet in this scaffold (see "Decisions needed" below
and the code comments marking them as not wired up).

## Project structure

```
prisma/schema.prisma       Data model (see below)
prisma/seed.ts             Sample hospital/units/users/shifts/credentials
src/proxy.ts               Optimistic route-level auth gate (Next 16 renamed
                            "middleware" to "proxy" — see AGENTS.md)
src/lib/session.ts          JWT session encode/decode, cookie management
src/lib/password.ts         bcrypt hash/verify
src/lib/dal.ts              Data Access Layer — verifySession(), getCurrentUser(),
                            requireRole(), scopedUnitIds(). Every data query
                            in src/lib/data/* goes through this.
src/lib/data/admin.ts       Admin-only queries (org-wide)
src/lib/data/manager.ts     Manager queries, hard-scoped to their unit(s)
src/lib/data/worker.ts      Worker queries, hard-scoped to their own userId
src/app/admin/              Admin dashboard (org/unit overview, call-ins)
src/app/manager/[unitId]/   Manager dashboard (census, schedule, approval queue)
src/app/worker/             Worker dashboard (my schedule, my credentials)
src/app/login/              Badge number + password login
```

### Role scoping — enforced server-side, not just in the UI

- `proxy.ts` does a fast, cookie-only redirect if a worker hits `/admin`, etc.
  This is **not** the security boundary — it's just UX.
- The real boundary is `src/lib/dal.ts` + `src/lib/data/*`: every query is
  scoped by the verified session's `userId`/`accountType`/unit memberships,
  independent of whatever path was requested. `assertUnitInScope()` in
  `src/lib/data/manager.ts` throws if a manager's request references a unit
  they aren't assigned to, even if the route parameter is manipulated.

### Data model highlights

- `Hospital` → `Unit` → `UnitMembership` (join table with `isPrimary` and an
  optional `priorityGroupId` for self-scheduling order)
- `SuperuserAssignment` — the "two extra-permission seats per manager" from
  the spec. The founder hadn't defined the exact permission scope yet, so
  `permissions` is a JSON field rather than hardcoded booleans — extend it
  once the scope is defined, without a migration.
- `SchedulePeriod` (draft/published) → `Shift` → `ScheduleAssignment` — census
  is computed live (assignment count vs. `Shift.requiredCount`), not stored.
- `TimeEntry.source` is an enum (`APP` / `IVR` / `MANUAL`) so the IVR phase
  can write into the same table later without a schema change.
- `Credential.type` covers the licenses/certs named in the spec (RN license,
  ACLS, PALS, BLS, NIHSS, CCRN, CMC, advanced degree) plus `OTHER` with a
  `customName` field.
- `CallIn` links a `Shift` to the worker who called in and (optionally) the
  admin who handled it.

## Decisions needed from Anthony (not guessed on)

1. **Superuser permission scope.** The schema has an extensible
   `SuperuserAssignment.permissions` JSON field, but what those two extra
   manager seats can actually *do* (approve across units? override priority
   tiers? edit published schedules?) still needs to be defined.
2. **Priority-group / self-scheduling mechanics.** The schema supports
   ranked tiers per unit (`PriorityGroup.rank`), but the actual open/close
   windows per tier, how ties are broken, and whether tiers can vary by
   schedule period aren't specified yet.
3. **IVR vendor.** `TimeEntry.source = IVR` is modeled, but Twilio (or an
   alternative) integration is out of scope for this pass, per your
   instructions.
4. **Multi-hospital badge-number login.** `User.badgeNumber` is unique
   *per hospital* (`@@unique([hospitalId, badgeNumber])`), matching how real
   hospitals assign IDs. But the current login form only asks for a badge
   number + password — it resolves the user with `findFirst`, which assumes
   one hospital per deployment. If Stat Workforce becomes multi-tenant (one
   deployment serving multiple hospital customers), the login flow needs a
   way to disambiguate the hospital (subdomain, hospital code field, etc.)
   before this is production-safe.
5. **File storage for credential uploads.** `Credential.fileUrl` is a plain
   string field — no upload flow or storage provider (S3, Render disks,
   Cloudinary, etc.) is wired up yet.
6. **Credential/schedule-publish notification delivery.** `Notification` rows
   are modeled, but there's no push/SMS/email delivery mechanism connected —
   worth deciding before the "2 months / 1 month before expiration" and
   "schedule published" reminders can actually reach anyone.

## Deploying to Render

`render.yaml` describes a web service + managed Postgres database. It has
**not** been applied — no Render service was created, since that requires
Anthony's Render login. To deploy:

1. Push this repo to GitHub (see below).
2. In Render, "New +" → "Blueprint" → point at the GitHub repo. Render will
   read `render.yaml` and provision the web service + Postgres.
3. Set `SESSION_SECRET` in the Render dashboard (marked `sync: false` in
   `render.yaml` so it isn't committed).
4. Render will run `npm install && npm run build` then `npm start`. Run
   `npm run db:migrate` once (via a Render shell or a one-off job) against
   the managed database before the first deploy is useful.

## GitHub

The GitHub CLI (`gh`) is **not installed** in the environment this scaffold
was built in, so no repository was created or pushed automatically. The repo
is committed locally and ready — Anthony needs to create a GitHub repo and
push it himself (or install `gh` and re-run) before Render's auto-deploy-on-push
can be wired up:

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```
