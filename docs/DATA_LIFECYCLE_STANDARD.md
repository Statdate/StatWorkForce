# Data Lifecycle Standard — Draft for Approval

Last updated: October 31, 2026

This is a product/operations baseline that must be reconciled with customer contracts, record-retention duties, privacy law, litigation holds, insurer requirements, and counsel. It is not a final legal retention schedule.

## Principles

- Collect only workforce data required for contracted scheduling, credential, communication, audit, and support functions; do not intentionally collect patient clinical data.
- Isolate every hospital in application authorization and database integrity controls.
- Encrypt data in transit and at rest using managed service controls; keep credential-document storage private.
- Restrict production access to named personnel with an approved operational need and retain access/audit evidence.
- Never use production customer data in development, demonstrations, sales, or automated tests.

## Approval matrix

The hospital, product owner, security/privacy lead, and counsel must assign each duration before production.

| Data class | Examples | Proposed trigger | Approved retention | Disposal verification |
| --- | --- | --- | --- | --- |
| Identity/access | badge identifier, role, unit, status | account termination | TBD | account disabled, sessions revoked, downstream copies handled |
| Scheduling/time off | shifts, assignments, requests | record date/contract | TBD | database deletion/anonymization evidence |
| Credential metadata/files | credential dates and documents | expiry/termination | TBD | DB record and private object deletion evidence |
| Messages/notifications | workforce messages and delivery state | message date/contract | TBD | database deletion evidence |
| Security/audit | immutable audit and login controls | event date | TBD | approved expiry process preserving required legal evidence |
| Backups | managed DB/object snapshots | snapshot creation | TBD | provider expiry/deletion evidence |
| Support/incident records | tickets, incident evidence | closure date | TBD | controlled system disposal evidence |

## Customer access, export, and correction

Define authorized requester verification, export scope/format, secure transfer, response target, correction workflow, audit evidence, and whether statutory individual-rights requests are handled by the hospital as controller/business associate. The current product provides hospital-scoped audit export; broader contractual export automation remains a production-readiness requirement.

## Termination and deletion

1. Authenticate the hospital's authorized requester and confirm the contractual end date, litigation/security holds, and required return/export.
2. Freeze ordinary changes and generate the approved export through a secure transfer channel.
3. Obtain written acceptance or expiry of the agreed retrieval window.
4. Disable users, revoke sessions/integrations, and remove live database/object records using a reviewed, tenant-scoped procedure.
5. Allow encrypted backups to expire under the approved schedule unless the contract requires targeted deletion and the provider supports it.
6. Remove monitoring/support copies, revoke service identities, and issue a deletion record listing systems, dates, operators, reviewers, exceptions, and remaining backup expiry.

No operator should perform tenant deletion through ad-hoc SQL. Implement and independently test an idempotent, hospital-scoped deletion/export workflow before a contract requires it.

## Holds and exceptions

Security incidents, disputes, regulatory requests, or litigation may suspend ordinary deletion. The authorized legal/privacy owner records the scope, reason, approval, review date, access restrictions, and release. Exceptions require an owner and expiration; they must not silently become indefinite retention.
