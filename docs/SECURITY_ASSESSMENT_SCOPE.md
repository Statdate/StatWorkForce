# Security Assessment and Penetration-Test Scope

Last updated: October 31, 2026

This document prepares an independent assessor; it is not an assessment result or certification. Test only environments, accounts, dates, and techniques approved in a signed rules-of-engagement document. Never test a hospital production environment without its written authorization.

## In-scope surfaces

- Next.js web application, API routes, server actions, proxy route gate, and session cookies
- Mobile bearer-token APIs and Expo client token storage/transport behavior
- Hospital-code and badge authentication, login throttling, password change, administrator unlock, and session revocation
- Administrator, manager, and worker authorization across pages, actions, and APIs
- Hospital and unit tenant boundaries, including direct-object-reference and cross-tenant attempts
- Schedule creation/publication/signup, time off, credentials/files, messages, notifications, audit export, and administrative configuration
- Cron/admin machine-secret endpoints and replay/authorization behavior
- PostgreSQL constraints/triggers, migrations, connection security, backups, and restore access
- Private credential-document object storage, signed/access paths, content validation, and metadata exposure
- Hosting, DNS/TLS, HTTP headers, secrets, CI/CD, dependencies, logging, monitoring, and operational access

## Security properties to verify

- Every protected operation reauthorizes the authenticated user server-side; route middleware is not treated as the authorization boundary.
- A user cannot read, mutate, enumerate, or infer another hospital's records.
- Managers are limited to authorized units; workers are limited to their own records and eligible shifts.
- User-controlled IDs, dates, uploads, pagination, and filters cannot bypass authorization or exhaust resources.
- Login responses resist account/hospital enumeration; throttling is durable; revoked sessions stop working immediately.
- Audit records are hospital-scoped, append-only through application and database controls, and export access is restricted.
- Credential uploads enforce ownership, size/type controls, private storage, safe download headers, and non-executable handling.
- Schedule overlap, capacity, qualification, credential, and tenant-integrity controls hold under concurrent requests.
- Machine endpoints fail closed when secrets are absent/invalid and do not expose customer data in responses or logs.
- Errors, health endpoints, build artifacts, source maps, headers, and logs do not disclose secrets or unnecessary customer information.

## Required test identities and data

Provide two synthetic hospitals, each with administrator, manager, and worker accounts; at least two units per hospital; expired/current credentials; open/full/conflicting shifts; pending time off; messages; audit events; and revoked/locked accounts. Use synthetic documents only. Supply separate machine credentials and a private test bucket. Reset all secrets after testing.

## Rules of engagement decisions

- Approved environment/hostnames and source IPs: TBD
- Test window, emergency stop contact, and status channel: TBD
- Allowed concurrency, rate tests, upload sizes, scanners, and social engineering: TBD
- Prohibited denial-of-service, persistence, destructive actions, and access to real customer data: required unless separately approved
- Evidence encryption, transfer, retention, disclosure, and deletion: TBD
- Severity model, retest terms, report recipients, and remediation deadlines: TBD

## Deliverables and exit criteria

Require an executive summary, technical findings with reproducible evidence, affected assets, realistic impact, severity rationale, remediation guidance, and confirmation of evidence deletion. Each finding needs an owner and due date. Critical/high findings must be remediated and independently retested before external pilot use; accepted residual risk requires named owner, rationale, compensating controls, expiry, and customer/legal review where applicable.
