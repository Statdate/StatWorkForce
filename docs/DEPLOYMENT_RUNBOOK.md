# Hospital Deployment Runbook

Last updated: October 31, 2026

Stat Workforce is delivered as a vendor-hosted web application and companion mobile app. The recommended hospital rollout is a dedicated staging environment followed by a separately configured production environment. Do not use real patient data; the product is for workforce operations, and the pilot data set should be minimized to what scheduling and credential workflows require.

## Platform baseline

- Web/API: the repository's non-root Docker image or Render Node service
- Database: managed PostgreSQL with encryption, point-in-time recovery, and a tested restore procedure
- Credential documents: private S3-compatible object storage using workload identity; no public bucket access
- Mobile: Expo/EAS builds distributed through Apple Business Manager/TestFlight and Google Play managed testing before store production tracks
- TLS and DNS: customer-facing HTTPS domain with provider-managed certificate
- Monitoring: external uptime check on `/api/health`, application error reporting, database alerts, and an owned escalation channel

The current `render.yaml` is appropriate for a staging demonstration. A hospital production launch must use a paid, highly available service/database plan selected for the contracted recovery and support targets.

## First staging deployment

1. Create a managed PostgreSQL database and require TLS in its connection string.
2. Create two independent secrets with `openssl rand -base64 48`.
3. Configure `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`, `DEPLOYMENT_TIER=staging`, and the object-storage variables in the hosting control plane.
4. Run `npm run deploy:preflight`. It prints configuration names only and never prints secret values.
5. Run `npm run db:migrate:deploy`, deploy the immutable commit, and verify `GET /api/health` returns HTTP 200.
6. From a trusted runner, set `SMOKE_BASE_URL=https://<staging-host>` and run `npm run test:smoke`.
7. Create staging-only administrators and test users. Never retain seeded passwords in a shared environment.
8. Record the commit SHA, migration result, smoke-test evidence, operator, and timestamp in the release record.

## Production promotion gate

- Use a distinct database, object bucket, secrets, domain, and monitoring configuration from staging.
- Set `DEPLOYMENT_TIER=production`; preflight then requires credential object storage.
- Confirm backups, retention, point-in-time recovery, and a successful restore drill.
- Confirm encryption, least-privilege service identity, private bucket policy, log retention, and secret rotation owners.
- Complete penetration testing, vendor-risk review, legal/BAA decisions, incident response, and customer go-live approval.
- Deploy the exact commit validated in staging, apply migrations once, run smoke checks, and obtain written approval before importing customer workforce records.

## Rollback and recovery

Application rollback means redeploying the prior known-good image or commit. Database migrations are forward-only: do not run ad-hoc destructive down migrations. If a schema release cannot be corrected forward, stop writes, preserve forensic logs, and restore the documented database snapshot into a replacement instance under the incident procedure.

For credential storage or database failure, place the service in maintenance mode at the hosting layer, notify the designated incident owner, and follow the contracted recovery and communication targets. A deployment is not considered recoverable until a restore drill has demonstrated those steps.

## Evidence to retain

- Pull-request approval, CI results, dependency audit, and immutable commit SHA
- Hosting/database/object-storage configuration review (with secrets redacted)
- Migration, health, smoke, backup, and restore-drill results
- Security assessment and remediation evidence
- Customer configuration, training completion, cutover approval, and rollback decision owner
