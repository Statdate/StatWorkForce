# Hospital Pilot Readiness Gate

Last updated: October 31, 2026

This checklist separates code readiness from the legal, operational, and customer-specific work required before a hospital pilot. A checked item means evidence exists in this repository or the validated local environment; it is not a regulatory certification.

## Automated release gate

- [x] Database migrations apply from a clean test database
- [x] Seeded validation organization loads
- [x] Web lint, unit tests, and TypeScript pass
- [x] Mobile lint and TypeScript pass
- [x] Web production build succeeds
- [x] Mobile web export succeeds in CI
- [x] Production-server smoke checks cover health, authentication, tenant-qualified login, role boundaries, schedule access, audit access, and cron authentication
- [x] CI runs on pull requests and pushes to `main`
- [x] Deployment preflight validates remote TLS database configuration, independent strong secrets, deployment tier, and production object storage
- [x] Guarded logical backup/restore drill and operational evidence template are available
- [x] Separate process liveness and database readiness checks plus scheduled external probe are available
- [x] Incident-response workflow, severity framework, breach-decision path, and pilot support operating template are documented
- [x] Weekly web, mobile, GitHub Actions, and Docker dependency-update tracking is configured
- [x] Independent security assessment scope, required synthetic tenants, rules of engagement, and retest exit criteria are documented
- [x] Data-minimized structured server-error telemetry includes environment/release/route dimensions without request or customer contents
- [x] Audited hospital-scoped operational data export excludes authentication, push, document-storage, and provider secrets
- [ ] Browser-driven critical-path testing across Chrome, Safari, and Edge
- [x] Chromium browser critical paths cover anonymous access, invalid tenant login, worker, manager, administrator, navigation, and sign-out in CI
- [x] Automated WCAG A/AA scans and phone-viewport overflow regression checks run in CI
- [ ] Mobile device regression pass on supported iOS and Android versions
- [ ] Load test using the pilot's expected worker, unit, and schedule volumes
- [x] Configurable authenticated read-only load harness enforces error-rate and p95 latency thresholds

## Product controls implemented

- [x] Hospital and unit authorization boundaries
- [x] Database tenant-integrity triggers
- [x] Durable login throttling and administrator unlock
- [x] Immediate session revocation
- [x] Forced initial password replacement
- [x] Immutable hospital-scoped audit log and export
- [x] Scheduling overlap, capacity, qualification, and credential checks
- [x] Hospital-local workload week and warning policy
- [x] Credential document storage abstraction and expiration alerts
- [x] Durable push-delivery outbox and failure visibility
- [x] Administrator provisioning, role, unit, password, and status controls

## Required before external pilot launch

- [ ] Commit and peer-review the accumulated change set
- [ ] Deploy to a non-production staging environment
- [ ] Run the automated smoke suite against staging
- [ ] Configure managed Postgres backups and perform a restore drill
- [ ] Configure production object storage with workload identity
- [ ] Configure APNs/FCM credentials and verify delivery on real devices
- [ ] Enable application error monitoring, uptime monitoring, and alert ownership
- [ ] Complete independent security review and penetration test
- [ ] Document incident response, escalation contacts, and breach workflow
- [ ] Approve privacy policy, terms, subscription agreement, data-processing terms, and BAA position with counsel
- [ ] Establish cyber liability and required vendor insurance
- [ ] Define data retention, customer export, and termination/deletion procedures
- [ ] Confirm support hours and response targets for the pilot

## Customer-specific readiness

Use the [hospital pilot implementation plan](HOSPITAL_PILOT_IMPLEMENTATION_PLAN.md) to assign owners, scope, success measures, test evidence, training, parallel run, cutover, rollback, and written approvals.

- [ ] Name executive sponsor, clinical owner, IT owner, and project manager
- [ ] Approve pilot units and worker population
- [ ] Document scheduling, union, seniority, rest-period, overtime, and approval rules
- [ ] Confirm authoritative HR, payroll, identity, and credential sources
- [ ] Decide which integrations are required for pilot versus expansion
- [ ] Complete the hospital's vendor-risk and security questionnaires
- [ ] Agree on baseline metrics and success criteria
- [ ] Approve data migration, validation, training, parallel-run, rollback, and cutover plans
- [ ] Train administrators and unit champions
- [ ] Obtain written go-live approval from the customer and Stat Workforce owners

## Readiness artifacts available

- [x] Fillable hospital pilot phase gates, ownership matrix, success measures, parallel-run, cutover, and approval plan
- [x] Draft data lifecycle, retention approval matrix, export/return, termination/deletion, backup expiry, and legal-hold standard

## Current release decision

**Code status:** suitable for staging and a controlled internal demonstration.

**External hospital pilot status:** conditional. Do not place regulated or production hospital data into the service until the unchecked operational, security, legal, and customer-specific gates applicable to the pilot are completed and documented.
