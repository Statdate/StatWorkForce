# Stat Workforce

Hospital workforce management — scheduling, timekeeping, and credential
tracking for hospital units.

Not building right now, but on record for later: see
[ROADMAP.md](ROADMAP.md) for the Phase 2 backlog (auto-fill scheduling,
acuity-based staffing calculator, forecasting, and more).

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

| Role            | Badge number | Notes                          |
| --------------- | ------------ | ------------------------------- |
| Admin           | `10001`      | "Kaiser" — sees the whole hospital (Kaiser Los Angeles Medical Center) |
| Manager (ADA)   | `20001`      | Angela Allen — Pre-op, PACU A/B, PACU/PRE-OP, Overnight, Charge Nurse (not ICU) |
| Asst. ADA       | `20002`      | Brian Yu — Pre-op, PACU A/B, PACU/PRE-OP, Overnight, Charge Nurse |
| Asst. ADA       | `20003`      | Elline Williams — Pre-op, PACU A/B, PACU/PRE-OP, Overnight, Charge Nurse |
| Worker          | `30001`      | Jamie Nurse — ICU, has an expired BLS cert |
| Worker          | `30002`      | Taylor Rivera — ICU |
| Worker          | `30003`      | Casey Kim — ICU, reported the sample call-in |
| Worker          | `30004`      | Sam Patel — ICU, ED |
| Worker          | `30005`      | Traci — Pre-op |
| Worker          | `30006`      | Eileen — Pre-op |
| Worker          | `30007`      | Anthony Brown — PACU A |
| Worker          | `30008`      | Vanessa Hawkins — PACU A |
| Worker          | `30009`      | Ray — PACU B |
| Worker          | `30010`      | Edward — PACU B |
| Worker          | `30011`      | Peter — Pre-op |
| Worker          | `30012`      | Emily — Pre-op |
| Worker          | `30013`      | Kathleen DeLaCruz — PACU A |
| Worker          | `30014`      | Lydia Rodriguez — PACU A |
| Worker          | `30015`      | Christopher Vraa — PACU A |
| Worker          | `30016`      | Jonalyn Turbola — PACU A |
| Worker          | `30017`      | Paul — PACU B |
| Worker          | `30018`      | Cliffanie — PACU B |
| Worker          | `30019`      | Grace C — Overnight |
| Worker          | `30020`      | Marian — Overnight |
| Worker          | `30021`      | Saritha — Overnight |
| Worker          | `30022`      | Denise — Overnight |
| Worker          | `30023`      | Anthony — Overnight |
| Worker          | `30024`      | Tilahun — Orderly |
| Worker          | `30025`      | Sal — Orderly |
| Worker          | `30026`      | Christina Santiago — Charge Nurse |
| Worker          | `30027`      | Edwin Bautista — Charge Nurse |
| Worker          | `30028`      | Rosalie Kneebone — Charge Nurse |

ICU currently has no manager assigned in the seed data (Angela's org was
restructured to Pre-op/PACU A/B/PACU-PRE-OP/Overnight/Charge Nurse — see git log around
`sync-org-structure` for why); admin is the only account that can review
ICU's credentials/time-off/pickups on web today.

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
  assignment. Verified. (Workers can no longer self-cancel a shift — see
  "Time off requests" below for the replacement flow.)
- **Manager timecard approval** — Approve/Reject buttons on the approval
  queue call `setTimeEntryApproval`, scoped so a manager can only act on
  entries from workers who share one of their units. Verified an approval
  clearing the queue.
- **Manager↔worker private messaging** — two-way threads scoped to
  unit-sharing manager/worker pairs, with unread counts. Verified sending in
  both directions and the unread badge clearing on open.

- **Credential document upload** — workers attach a PDF/image to each
  credential (web upload form + mobile document picker, both backed by the
  same `/api/credentials/[id]/file` route). Verified: uploaded a PNG through
  the API, downloaded it back byte-identical with correct
  Content-Type/Disposition headers, wrong file types rejected with a 400,
  unauthenticated requests get 401, and another worker's token gets 404
  (ownership is enforced by filtering on the session's userId, never a
  client-supplied one).

- **Credential management + expiry notifications** — workers add credentials
  through a type dropdown (RN/LPN license, ACLS, BLS, PALS, NIHSS, CCRN, CMC,
  advanced degree, specialty/other with a custom name) with an optional
  document in the same submit. Managers get a per-unit compiled list
  (soonest-expiring first, with status badges, document links, workers with
  nothing on file, and a Print button backed by print CSS); admins get the
  same hospital-wide with a unit column. Verified in the browser as all three
  roles: added a PALS credential via the dropdown, watched the expiry sweep
  auto-generate worker + manager notifications for it (and for the seeded
  expired BLS / expiring ACLS), confirmed the manager alerts panel and worker
  Notifications tab render them, confirmed managers/admins can open worker
  documents, and confirmed the sweep is idempotent (4 rows stayed 4 after
  repeated runs).

- **Time off requests — replaces worker self-cancel.** Workers can no longer
  drop a shift themselves (`dropShift`/`dropShiftAsUser` and the "Cancel"
  button/route were removed everywhere — web, mobile, and
  `/api/schedule/drop`). Instead they submit a `TimeOffRequest` (Sick /
  Vacation / Life Balance, a date range, optional reason) from
  `/worker/time-off` (web) or the mobile Time Off tab; pending requests can
  be withdrawn by the requester. Managers review pending requests per unit at
  `/manager/[unitId]/time-off`; approving a request auto-releases (drops)
  any of that worker's active shift assignments whose start time falls
  inside the approved range, freeing them back to open shifts — this is the
  actual mechanism that replaces self-cancel, just gated behind approval
  instead of instant. Verified end-to-end in the browser: signed up for a
  shift as a worker, submitted a Vacation request covering that shift's
  date, approved it as the manager, and confirmed via direct DB query that
  only that one assignment's `updatedAt` changed (to `DROPPED`) at the exact
  moment of approval — then confirmed the shift reappeared in the worker's
  Open Shifts list. Also verified all four mobile API routes
  (`GET`/`POST /api/timeoff`, `DELETE /api/timeoff/[id]`): list, create,
  withdraw, re-withdraw correctly rejected ("already reviewed"), and 401 for
  unauthenticated requests.

Not yet exercised: admin call-in handling actions — those remain read-only
in this pass.

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
                            open-shift sign-up, time off requests
src/lib/data/messages.ts    Manager<->worker messaging, scoped to shared units
src/app/actions/            Server actions (login, schedule sign-up,
                            timecard approve/reject, send message, time off)
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
5. **File storage for credential uploads — decided (revisit at scale).**
   Documents are stored inline in Postgres (`Credential.fileData BYTEA`,
   capped at 10 MB, PDF/JPEG/PNG/WebP/HEIC only). Chosen because Render's
   web-service disk is ephemeral (filesystem storage would vanish on every
   deploy) and an object store would add external credentials to the deploy
   for what are small, per-worker files. If upload volume grows, swap to
   S3/R2 by replacing only `saveCredentialFileForUser` /
   `getCredentialFileForUser` in `src/lib/data/worker.ts` — nothing else
   touches the bytes.
6. **Notification delivery — in-app done, push registration done, APNs
   credentials are the one remaining step.** Credential-expiry reminders
   exist as in-app notifications (idempotent sweep, 2 months before
   expiration, worker + unit managers) *and* as real push notifications via
   Expo's push API (`src/lib/push.ts`), sent alongside every notification
   the sweep creates. The daily trigger is a GitHub Actions scheduled
   workflow (`.github/workflows/credential-sweep.yml`) calling `POST
   /api/cron/credential-sweep`, since Render's free tier has no built-in
   scheduler — this replaces the old load-triggered-only sweep (that still
   runs too, as a fallback, whenever a notification page loads). Two
   required env vars for the cron path: `CRON_SECRET`, set to the same
   value in Render's dashboard and as a GitHub Actions repo secret
   (Settings → Secrets and variables → Actions) — **done, verified live**
   (the cron endpoint returns `{"ok":true,...}` on the production URL).
   The mobile app is linked to an EAS project (`extra.eas.projectId` in
   `app.json`, owner `stat-workforce`) and **registration is confirmed
   working on a real device**: signed in on the iOS Simulator and watched
   `User.expoPushToken` update from a test placeholder to a real
   `ExponentPushToken[...]` value. **The one thing left: APNs credentials.**
   Sending an actual push to that real token returns `InvalidCredentials` —
   "Could not find APNs credentials for com.anonymous.statworkforce." iOS
   push requires an Apple Push Notification key registered with Apple and
   uploaded to the EAS project, which needs an **Apple Developer Program
   account** ($99/year, if not already enrolled). Once enrolled, run `npx
   eas-cli credentials` from `mobile/` (interactive — needs an Apple ID
   login, same as `eas login` did) and let EAS generate/upload the key.
   After that, no other code changes are needed — the send path is already
   wired, tested, and waiting on this one credential. SMS/email delivery is
   still an open choice if push isn't enough on its own.

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
- `GET /api/schedule/open`, `POST /api/schedule/signup` — self-scheduling,
  same unit-membership check as the web version. There's no drop/cancel
  route — see "Time off requests" above for how workers get out of a shift.
- `GET/POST /api/timeoff`, `DELETE /api/timeoff/[id]` — time off requests
  (list mine, submit, withdraw a pending one), same rules as the web
  version.
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
  (unit scoping, shared-unit messaging, time-off eligibility), not one per
  client.

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
app/(app)/_layout.tsx    Tabs — My Schedule, Time Off, My Credentials,
                         Messages, Alerts
app/(app)/index.tsx      My Shifts + Open Shifts + Calendar sync card
app/(app)/time-off.tsx   Request time off (Sick/Vacation/Life Balance) +
                         own request list, withdraw while pending
app/(app)/messages/      nested Stack: thread list -> conversation detail
```

Scope: view schedule, self-schedule (sign up for open shifts; no self-cancel
— submit a time off request instead), view
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
  real native build) is the correct path, and it needs **CocoaPods**. This
  Mac's system Ruby (2.6.10) was too old for CocoaPods, and there was no
  Homebrew/rbenv/rvm/asdf either. Fixed: installed Homebrew at the standard
  `/opt/homebrew` prefix (needed one `sudo mkdir && sudo chown` from Anthony
  first, since `/opt` requires root), then `brew install cocoapods` — pulled
  in a modern bottled Ruby alongside it, no source builds needed.
- **`npx expo run:ios` succeeded**: pods installed, all native modules
  (Reanimated, gesture-handler, `expo-calendar`, etc.) compiled, 0 errors,
  and the app installed onto a booted iPhone 17 Pro Simulator (confirmed on
  disk — `com.anonymous.statworkforce` in the simulator's app container).
- **Confirmed by hand-testing on the iOS Simulator** (Anthony, driving the
  Simulator directly — automation from the build environment wasn't possible:
  computer-use was blocked and `xcrun simctl launch` hung): login with badge
  `30001`, **Sync to Calendar** creating the event with the pre-shift alarm
  in the iOS Calendar app, and the calendar picker choosing a specific
  destination calendar. Two real bugs were found this way and fixed:
  requesting write-only calendar permission while also calling
  `getCalendars()` (write-only explicitly can't list calendars — switched
  the app to full access), and the picker's `FlatList` collapsing to zero
  height inside the modal (no bounded height anywhere in its parent chain).
- Verified via `npx expo start --web` against a freshly migrated and
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
  just not (yet) the actual native container's runtime behavior.
- **Calendar sync specifically**: the publish flow was verified end-to-end
  on web (Publish button → `SchedulePeriod.status` flips to `PUBLISHED` →
  `/api/schedule` reflects it), the "Published" badge and calendar-sync UI
  render correctly in the Expo web preview (correctly showing "Calendar
  sync requires the native app" instead of a crash, since `expo-calendar`
  is guarded behind a `Platform.OS !== 'web'` check), and the actual
  `createEvent` write + alarm was confirmed by hand in the Simulator's
  Calendar app (see above).
- **Credential document upload on mobile**: the backend route and web flow
  are fully verified (byte-identical round-trip, type/size/ownership
  rejection paths — see "Verified so far" above), the mobile screen
  typechecks, and the native build with `expo-document-picker` compiled and
  installed cleanly. Not yet hand-tested on the Simulator: tapping **Upload
  document**, picking a file from the Files app, and seeing the card flip to
  "Document: <name>". That's the next thing to poke at in the Simulator.
- **Push notifications**: `expo-notifications` compiled and installed
  cleanly in the native build. Anthony signed in on the iOS Simulator by
  hand (computer-use still can't drive the Simulator directly in this
  environment — see the calendar-sync section above for the same limit) and
  `User.expoPushToken` updated from a placeholder to a real
  `ExponentPushToken[p0ujdSLTpQOWr5idnpcFZl]`, confirming the entire
  registration chain: permission prompt → real token issued via the linked
  EAS project → sent to `POST /api/me/push-token` → saved. Sending an
  actual push to that real token via Expo's API returned
  `InvalidCredentials`: `"Could not find APNs credentials for
  com.anonymous.statworkforce"`. That's expected — iOS push needs an APNs
  key uploaded to the EAS project, which needs an Apple Developer Program
  account. See "Notification delivery" above for the exact next command
  (`eas credentials`) once that account exists. Every other part of the
  chain — token registration, the sweep, the Expo API call shape — is now
  proven end-to-end on a real device; APNs credentials are the only gap
  left.

## Later additions: biometric lock, scheduling requests, credential preview

- **Real staff names.** The seeded manager (`20001`) is Angela Allen; two
  assistant managers were added, Brian Yu (`20002`) and Elline Williams
  (`20003`), same ICU unit and manager permissions; the admin (`10001`) is
  Kaiser. A one-time `CRON_SECRET`-gated route
  (`/api/admin/sync-seed-identities`) applies the same rename to the already-
  deployed production database, since re-running the seed script isn't safe
  against live data.
- **Biometric (Face ID / Touch ID) lock — mobile only.** `expo-local-
  authentication` gates the app behind a lock screen after the token is
  restored from storage, if the user opted in from Settings. Code-complete
  and the native module compiled/installed cleanly in an `expo prebuild`;
  the actual Face ID prompt succeeding is native-only behavior that couldn't
  be hand-verified in this environment (no Simulator GUI access here) —
  Anthony should confirm on a real device or the Simulator.
- **Hospital + unit banner — mobile, worker accounts only.** `GET /api/me`
  now returns `hospitalName` and the worker's unit names; a banner renders
  above the tab bar for workers (not shown to manager/admin accounts, since
  they aren't scoped to a single unit the same way). Verified via the API
  response shape; the mobile banner component typechecks and reuses the
  same `useAuth()` data workers already had.
- **Time off hours dropdown.** `TimeOffRequest.hours` (int, 2–999, default 8)
  captures a total-hours-for-the-request figure alongside the existing date
  range; both web and mobile show a chip-style selector
  (2/4/6/8/10/12/16/24). Verified via the browser (web) and `POST
  /api/timeoff` (mobile API contract).
- **Credential document preview.** Workers (and managers/admins viewing a
  worker's file) can preview an already-uploaded credential document inline
  instead of only downloading it — a modal with an `<img>`/`<iframe>` on
  web, and `expo-web-browser`'s in-app browser rendering a `data:` URI on
  mobile (avoids adding a native PDF-rendering dependency, since WebKit
  renders PDF/image data URIs natively). The credential type dropdown's
  catch-all option was relabeled "Custom / Other". Verified visually in the
  browser for web; mobile is code-complete and typechecks, not hand-tested
  in the Simulator.
- **Calendar view of the schedule.** A hand-built month-grid calendar
  (no calendar library) shows a worker's shifts by day, with separate
  parallel implementations for web (`src/components/schedule-calendar.tsx`)
  and mobile (`mobile/src/components/schedule-calendar.tsx`). Verified
  visually and interactively (month navigation) in the browser for web.
- **6-week self-scheduling periods.** Managers release a 6-week period per
  unit (`createScheduleRequestWindow` — sets `SchedulePeriod.requestsOpen =
  true`, `endDate = startDate + 42 days`). Workers can only sign up for open
  shifts whose dates fall inside a released period; closing the period stops
  those shifts from appearing in the worker Open Shifts list.
- **Calendar sync moved into Settings — mobile.** Previously lived on the
  My Schedule tab; now it's under a dedicated Settings tab alongside the
  biometric-lock toggle, and is still restricted to worker accounts (not
  shown for manager/admin, since sync targets an individual's own shifts).

## Optimization pass: performance, security, error handling, accessibility

A follow-up pass auditing the whole app for query performance, security
gaps, error-handling gaps, and mobile accessibility, then fixing what was
concretely load-bearing (skipping speculative changes that didn't hold up
against how the app actually queries data or routes pages).

- **Database indexes.** Added `UnitMembership.unitId`,
  `ScheduleAssignment.userId`, and `Credential(userId, expirationDate)` —
  each covers a where-clause used by a real query (`getUnitStaff()`,
  `getMessageThreads()`, `getScheduleForUser()`, `getCredentialsForUser()`)
  that wasn't served by an existing unique/composite index (Postgres won't
  use a composite index for a filter on anything but its leftmost column).
- **N+1 fix.** The credential-expiry notification sweep
  (`src/lib/data/notifications.ts`) queried for a credential's unit
  managers inside its per-credential loop — one query per expiring
  credential. Now batches a single manager lookup across every unit
  touched by any due credential before the loop.
- **Login brute-force lockout.** 5 failed attempts against one badge
  number locks it out for 15 minutes (in-memory, per-process — fine for
  this single-instance Render deploy, documented as a limitation if ever
  scaled to multiple instances). Also closes a timing side-channel: a
  nonexistent badge now runs the same bcrypt compare (against a fixed
  dummy hash) as a wrong password, instead of returning early. Verified
  via curl: 5 wrong attempts on one badge → 429, a different badge's
  correct login still succeeds unaffected, the locked badge's *correct*
  password is still rejected while locked.
- **Error boundaries.** Added an app-wide `src/app/error.tsx` and a
  styled `src/app/not-found.tsx` so an unhandled Server Component error
  or a `notFound()` call renders on-brand instead of Next's generic
  default pages.
- **Server Action error surfacing.** Every mutating Server Action now
  wraps its call in try/catch and redirects back to the same page with
  the error message in a query param (`redirectWithError()` in
  `src/lib/action-error.ts`) instead of letting a thrown validation error
  become an unhandled exception — keeps the rest of the page's state
  intact and shows the actual reason (bad file type, closed request
  window, request already reviewed, etc.). Verified in the browser:
  submitting a "Custom / Other" credential with no name shows "Name the
  certification when choosing Specialty certification / Other." right on
  the credentials page, with the rest of the page (existing credentials,
  the form) untouched.
- **Mobile error states.** The schedule, credentials, notifications, and
  time off screens had no error handling around their initial data
  fetch — a failed request just left the screen looking like an empty
  state. Each now shows what went wrong with a Retry action. Verified via
  `expo start --web`: patched `fetch` to fail the credentials request,
  confirmed the error + Retry banner rendered, restored `fetch`, confirmed
  Retry recovered correctly.
- **Mobile accessibility.** Added `accessibilityLabel`/`accessibilityRole`/
  `accessibilityState` to form inputs, chip selectors (as radio buttons),
  and action buttons across sign-in, time off, credentials, and the
  schedule screen — React Native doesn't programmatically associate a
  label `Text` with a sibling `TextInput` the way an HTML `<label
  for>` does, so screen reader users had no way to tell what an input was
  for. Verified via `expo start --web` that `accessibilityLabel` compiles
  to a real `aria-label` in the DOM.
- **Reviewed and passed on:** moving `pg` out of the unused-dependency
  category turned out to be "move to devDependencies," not "remove" — the
  app only imports `@prisma/adapter-pg` (which depends on `pg` itself),
  but `pg` is genuinely used by this project's local migration-workaround
  scripts. Also reviewed the audit's `revalidatePath`-granularity and
  route-level-caching suggestions — both didn't hold up against how this
  app actually routes (each dashboard section is already its own route,
  so existing `revalidatePath` calls are already maximally specific) and
  authenticates (every page reads the session cookie, which forces
  dynamic rendering regardless of a `revalidate` export) — so no change
  was made there rather than adding speculative complexity.
