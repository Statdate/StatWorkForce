# Phase 2 / Future Roadmap — not yet built

This captures ideas Anthony wants on record for a later phase. Nothing here
is implemented. Current work continues on core functionality (scheduling,
timekeeping, credentials, messaging, alerts) uninterrupted — treat this file
as a backlog, not an in-progress plan.

## 1. Smart auto-fill scheduling

Constraint-solver-based engine (e.g. Google OR-Tools CP-SAT) that
auto-suggests/fills open shifts respecting:

- **Hard constraints**: credential match, unit staffing ratios, max
  consecutive shifts, minimum rest between shifts.
- **Soft constraints**: priority tiers, seniority, fairness in overtime/
  weekend distribution.

## 2. Census & acuity-based staffing calculator

Manager/admin inputs current patient census (and optionally acuity level)
for a unit; system calculates recommended/required nurse count against
configurable ratios — supports state-mandated ratios (e.g. California
Title 22) or hospital-set policy ratios per unit type. Ties directly into
the existing live census over/understaffed view (`getUnitScheduleForManager`
in `src/lib/data/manager.ts`) to make it precise instead of a rough
required-vs-filled flag.

## 3. Historical trend forecasting

Predictive staffing need based on historical census/admission patterns
(day-of-week, seasonality) so managers plan ahead of demand instead of
reacting to it.

## 4. Natural-language manager assistant (LLM layer)

E.g. "balance next week, minimize overtime, keep Sarah off weekends"
translated into scheduling constraints for the auto-fill engine (#1). Also
used to explain schedule gaps in plain English.

## 5. Automated system health / anomaly checker

Background job (solid engineering, not user-facing AI) that continuously
scans for data-integrity problems and surfaces them on an admin dashboard:

- Double-booked shifts
- A worker scheduled for a shift after their required credential will have
  expired
- Orphaned records, missing required fields
- Failed notification deliveries

Pair with:

- **A real automated test suite** (unit + integration tests) that runs on
  every change — there isn't one today; verification so far has been manual
  (typecheck/build/browser) per change.
- **Production error monitoring** (e.g. Sentry or similar) once this matters
  more, so runtime bugs surface automatically instead of via a hospital
  complaint.

## 6. Fatigue/safety risk flagging

Warn managers when a schedule would violate safe rest/consecutive-shift
patterns even if not a hard rule violation (softer signal than #1's hard
constraints).

## 7. Smart shift-swap matching

When a worker requests a swap or calls in, auto-suggest best-fit qualified/
available coworkers (matching credentials, priority tier, overtime rules)
instead of a manager manually browsing the roster.

## 8. Overtime/labor cost estimator

Live-estimate overtime cost as a manager builds/edits the schedule, before
publishing, so cost overruns are caught proactively — useful as a sales hook
for hospital finance stakeholders.
