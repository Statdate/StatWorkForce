# Release Candidate Evidence

Validation date: October 31, 2026  
Application commit: `e6a974a0787f6edfa9c1f7fe17267236931cbdcf`  
Environment: isolated local production-mode application and disposable restored PostgreSQL database

This record demonstrates repository-local readiness; it is not evidence of hosted GitHub checks, staging infrastructure, physical devices, managed-provider recovery, independent penetration testing, or regulatory certification.

## Passed gates

| Gate | Result |
| --- | --- |
| Clean web install / Prisma generation | Passed (`npm ci`, Prisma 7.10.1) |
| Web dependency audit | 0 full-tree and 0 production vulnerabilities |
| Unit tests | 40/40 passed across 11 files |
| Web lint and TypeScript | Passed |
| Production build | Passed; 46 application/API routes |
| Database recovery | Logical restore passed; 20/20 tables and 21/21 migrations matched |
| Migration deployment | Passed; no pending migrations after restore |
| Database security invariants | Tenant membership/job type, immutable audit, and scheduling constraints passed |
| Production API smoke | Health, auth, tenant, RBAC, schedule, exports, audit, and cron checks passed |
| Browser critical paths | 9/9 Chromium tests passed, including WCAG scans, roles, exports, and call-in handling |
| External-style monitoring probe | Liveness and database readiness passed |
| Load baseline | 500 requests, 25 concurrent users, 137.7 req/s, p50 169 ms, p95 327 ms, p99 384 ms, 0 failures |
| Clean mobile install | `npm ci` passed with Expo SDK 58 compatibility set |
| Mobile lint and TypeScript | Passed |
| Mobile web export | 18 static routes passed; main entry approximately 1.1 MB |
| Mobile audit release threshold | No critical/high production advisories; 13 moderate Expo build-tool advisories remain tracked |

## External gates still required

- GitHub-hosted CI/check review and peer approval
- Merge authorization
- Paid staging/production services, managed PostgreSQL, private object storage, secrets, DNS/TLS, and monitoring configuration
- Protected GitHub staging environment and remote staging-validation execution
- EAS/Apple/Google internal builds and supported physical-device testing
- Firefox, Safari/WebKit, and Edge verification
- Managed-provider snapshot/point-in-time recovery drill
- Named support, monitoring, security/privacy, legal, and incident owners
- Independent penetration test and remediation/retest
- Contract, privacy, BAA, retention/deletion, insurance, and customer vendor-risk approval
- Customer configuration, training, parallel run, and written go-live authorization

## Release decision

The repository is suitable for staging and controlled synthetic-data evaluation. It is not approved for regulated hospital production data until the applicable external gates above are completed and their evidence is attached to the controlled release record.
