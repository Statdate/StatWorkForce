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

A second pass added the interactive pieces and re-verified end to end against
a fresh local database:

- **Worker self-scheduling** — the worker schedule page shows open shifts in
  their unit(s) with live signup counts; sign-up creates a `SELF_SCHEDULED`
  assignment, cancel reverts it to `DROPPED`. Verified both directions.
- **Manager timecard approval** — Approve/Reject buttons on the approval
  queue call `setTimeEntryApproval`, scoped so a manager can only act on
  entries from workers who share one of their units. Verified an approval
  clearing the queue.
- **Manager↔worker private messaging** — two-way threads scoped to
  unit-sharing manager/worker pairs, with unread counts. Verified sending in
  both directions and the unread badge clearing on open.

Not yet exercised: credential upload (no file storage provider chosen yet)
and admin call-in handling actions — those remain read-only in this pass.

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
src/lib/data/manager.ts     Manager queries, hard-scoped to their unit(s);
                            timecard approve/reject
src/lib/data/worker.ts      Worker queries, hard-scoped to their own userId;
                            open-shift sign-up/cancel
src/lib/data/messages.ts    Manager<->worker messaging, scoped to shared units
src/app/actions/            Server actions (login, schedule sign-up/drop,
                            timecard approve/reject, send message)
src/app/admin/              Admin dashboard (org/unit overview, call-ins)
src/app/manager/[unitId]/   Manager dashboard (census, schedule, approval
                            queue, messages)
src/app/worker/             Worker dashboard (my schedule + open shifts, my
                            credentials, messages)
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

Live at **https://statworkforce.onrender.com** (Blueprint-deployed from
`render.yaml`: a free-tier web service + free-tier managed Postgres,
GitHub-connected for auto-deploy on every push to `main`; `render.yaml`'s
`buildCommand` runs `prisma migrate deploy` automatically as part of each
build, so schema changes ship without a manual step).

Two real deploy issues were hit and fixed along the way:

1. Declaring `NODE_ENV=production` as a Render env var applies it during the
   *build* phase too, which makes `npm install` skip devDependencies
   (`tailwindcss`, `@tailwindcss/postcss`, `typescript`) that `next build`
   needs. Removed it — Render already sets `NODE_ENV=production` for the
   running service on its own.
2. Render's external Postgres connections need `sslmode=require` in the
   connection string, or you get a misleading "access denied" error instead
   of a clear SSL error.

The free Postgres instance **expires 2026-08-02** unless upgraded to a paid
instance type — worth a calendar reminder before then.

## GitHub

Repo: **https://github.com/Statdate/StatWorkForce**. Pushed via SSH using a
key already present in `~/.ssh` (`statdate_github`); this repo's
`core.sshCommand` git config is set to use that key specifically, since it
isn't the account's default identity.

## Mobile app (Expo / React Native)

`mobile/` is a separate Expo Router (SDK 57) app in the same repo (not a git
submodule, not an npm workspace — just a sibling project sharing the parent
`.git`). It talks to the same backend as the web app via a small token-based
API layer rather than the cookie-based web session:

- `POST /api/auth/token` — badge number + password in, `{ token, user }` out.
  Same signed-JWT format as the web session (`src/lib/session.ts`), just
  handed back in a JSON body instead of an httpOnly cookie, since a mobile
  client stores it itself.
- `GET /api/me`, `GET /api/schedule`, `GET /api/credentials` — read-only,
  Bearer-token authenticated.
- `GET /api/schedule/open`, `POST /api/schedule/signup`,
  `POST /api/schedule/drop` — self-scheduling, same rules as the web version
  (unit-membership check on sign-up, self-scheduled-only on cancel).
- `GET /api/messages/threads`, `GET /api/messages/[partnerId]`,
  `POST /api/messages/send` — manager<->worker messaging, same
  shared-unit scoping as the web version.
- All of the above are `getApiUser()`-gated: `src/lib/dal.ts`'s
  non-redirecting counterpart to `getCurrentUser()`, since a 302 to `/login`
  makes no sense as a JSON response — these return a plain 401 instead.
- `src/proxy.ts` excludes `/api/*` from its redirect gate entirely — API
  routes verify their own auth via `getApiUser()`, matching the Next.js
  data-security guidance that Proxy coverage shouldn't be the only check.
- The core query/mutation logic in `src/lib/data/worker.ts` and
  `src/lib/data/messages.ts` is split into a redirect-on-miss web wrapper
  (`getMySchedule()`, `sendMessage()`, etc.) and a core function taking an
  already-resolved user (`getScheduleForUser()`, `sendMessageAsUser()`,
  etc.) — the API routes call the core functions directly with
  `getApiUser()`'s result, so there's exactly one copy of each rule
  (unit scoping, self-scheduled-only cancel, shared-unit messaging), not one
  per client.

Mobile app structure (`mobile/src/`):

```
lib/storage.ts          SecureStore on native, localStorage on web
lib/api.ts               fetch wrapper, attaches Authorization: Bearer <token>
lib/auth-context.tsx     AuthProvider/useAuth — signIn/signOut/user/isLoading
lib/calendar.ts          expo-calendar sync: permission, writable-calendar
                         lookup, create events with alarms, dedupe via a
                         local shiftId->eventId map
lib/settings.ts          alarm-offset-minutes preference (local, per device)
app/_layout.tsx          Stack.Protected guard on auth state (Expo Router's
                         current recommended auth pattern)
app/sign-in.tsx          badge number + password
app/(app)/_layout.tsx    Tabs — My Schedule, My Credentials, Messages
app/(app)/index.tsx      My Shifts + Open Shifts + Calendar sync card
app/(app)/messages/      nested Stack: thread list -> conversation detail
```

Scope: view schedule, self-schedule (sign up/cancel open shifts), view
credentials, manager<->worker messaging, and calendar sync with a
configurable pre-shift alarm — matching everything the original spec
described for mobile.

### Calendar sync + pre-shift alarm

- **Publish gate.** The spec says workers sync "once a schedule is fully
  published" — `SchedulePeriod.status` (`DRAFT`/`PUBLISHED`) already existed
  in the schema but nothing set it. Added a **Publish** button per schedule
  period on the manager's unit page (`src/lib/data/manager.ts`'s
  `getSchedulePeriods()`/`publishSchedulePeriod()`); only `PUBLISHED` shifts
  (or shifts with no period at all) are calendar-syncable. `getScheduleForUser()`
  now includes `schedulePeriod.status` so both web and mobile can show a
  "Published" badge and gate the sync.
- **Sync mechanics.** `expo-calendar`'s modern API (`Calendar.requestCalendarPermissions()`
  → `Calendar.getCalendars()` → `calendar.createEvent({..., alarms: [{ relativeOffset: -N }]})`)
  creates one calendar event per published shift, with an alarm N minutes
  before start. `N` is a plain number input on the My Schedule screen,
  stored locally (device-only preference, not synced to the backend — it's
  personal, not organizational, so this seemed like the right call rather
  than adding a server-side setting for it).
- **No duplicates.** A local `shiftId -> calendar event id` map means
  re-tapping "Sync to Calendar" only creates events for shifts added since
  the last sync, not everything again.
- **iOS requests write-only calendar access** (`writeOnlyAccess: true` in the
  `expo-calendar` config plugin in `app.json`) rather than full read/write —
  the app only ever creates events, never reads the existing calendar, so
  the narrower permission is the more honest ask.

### Running the mobile app

```bash
cd mobile
npm install
npm run ios   # or: npm run web
```

`mobile/.env` defaults `EXPO_PUBLIC_API_URL` to `http://localhost:3000`,
which works for the iOS Simulator (shares the Mac's network namespace) with
the Next.js dev server running alongside. For a physical device or Android
emulator, point it at your machine's LAN IP instead — `localhost` on-device
means the device itself, not your dev machine.

### Verified so far / known gaps

- **Expo Go doesn't support SDK 57 yet** (too new) — `npx expo run:ios` (a
  real native build) is the correct path, but that needs **CocoaPods**,
  which isn't installed in the sandbox this was built in. Not something I
  worked around — `gem install cocoapods` (or Homebrew) would unblock it.
- Verified instead via `npx expo start --web` against a freshly migrated and
  seeded database: logged in as a seeded worker; cancelled a self-scheduled
  shift and watched it move to Open Shifts with the signup count updating;
  signed back up and watched it move back; opened the Messages tab, sent a
  message to the unit's manager, and saw it render as a bubble with a
  timestamp; sign-out correctly returned to the sign-in screen
  (`Stack.Protected` guard reacting to auth state). Every new API route
  (`/api/schedule/open`, `/signup`, `/drop`, `/api/messages/threads`,
  `/api/messages/[partnerId]`, `/api/messages/send`) was also hit directly
  with curl first to confirm the backend logic independent of the UI. This
  exercises the same React components and API calls a native build would —
  just not the actual native container.
- Before relying on this for real device testing, install CocoaPods and run
  `npx expo run:ios` (or `run:android`) at least once to confirm the native
  build itself works — Expo web can't catch native-module-specific issues.
- **Calendar sync could not be exercised at all in this environment** —
  `expo-calendar` has zero web support (unlike the rest of the app) and
  isn't supported in Expo Go either, so with no CocoaPods and no physical
  device available here, there was no way to trigger a real permission
  prompt or confirm an event actually lands in a calendar app with the
  correct alarm. What *was* verified: the publish flow end-to-end on web
  (Publish button → `SchedulePeriod.status` flips to `PUBLISHED` →
  `/api/schedule` reflects it), the "Published" badge and calendar-sync UI
  rendering correctly in the Expo web preview (correctly showing "Calendar
  sync requires the native app" instead of a crash, since `expo-calendar`
  is guarded behind a `Platform.OS !== 'web'` check), the alarm-offset
  input persisting across reloads, and `tsc --noEmit` passing for
  `src/lib/calendar.ts` against the documented SDK 57 API. The actual
  `calendar.createEvent(...)` call and its alarm has not been confirmed
  against a real calendar app — treat that specific path as unverified
  until someone runs it on a device or a CocoaPods-enabled build.
