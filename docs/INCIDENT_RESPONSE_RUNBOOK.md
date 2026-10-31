# Incident Response Runbook

Last updated: October 31, 2026

This runbook is an operating template, not legal advice. Before a hospital pilot, name the people in every role, align notification duties with signed contracts and applicable law, and exercise the procedure.

## Roles and contacts

Maintain the live contact roster outside this public repository.

| Role | Primary | Backup | Responsibility |
| --- | --- | --- | --- |
| Incident commander | TBD | TBD | Own decisions, timeline, and handoffs |
| Technical lead | TBD | TBD | Investigation, containment, recovery |
| Security/privacy lead | TBD | TBD | Data assessment, evidence, notification analysis |
| Customer communications | TBD | TBD | Approved hospital updates and status cadence |
| Legal/counsel | TBD | TBD | Breach/contract analysis and legal preservation |
| Hosting/vendor escalation | TBD | TBD | Provider incidents and infrastructure recovery |

## Severity and initial targets

These are proposed pilot targets and become commitments only when approved in a contract.

| Severity | Example | Acknowledge | Update cadence |
| --- | --- | --- | --- |
| SEV-1 | Confirmed unauthorized disclosure, widespread outage, or destructive data loss | 15 minutes | 30 minutes |
| SEV-2 | Major function unavailable, suspected access incident, or material data-integrity risk | 30 minutes | 60 minutes |
| SEV-3 | Limited degradation with workaround and no suspected disclosure | 4 business hours | Daily |
| SEV-4 | Minor defect or support request | 1 business day | As agreed |

## Response workflow

1. **Detect and record:** open a restricted incident record, assign an incident commander, capture UTC time, reporter, environment, symptoms, and alert source.
2. **Preserve:** retain relevant application, hosting, identity, database, object-storage, deployment, and audit evidence. Do not place secrets or regulated records in chat or public tickets.
3. **Contain:** revoke affected sessions, rotate exposed secrets, disable compromised accounts/integrations, restrict traffic, or place the service in maintenance mode. Preserve evidence before destructive cleanup when feasible.
4. **Assess:** establish affected hospitals, users, data types, time range, access path, integrity impact, ongoing risk, and confidence level. Treat facts, hypotheses, and unknowns separately.
5. **Communicate:** use the approved customer channel and cadence. State known impact, mitigations, customer actions, next update, and incident owner. Do not speculate or characterize an event as a legal breach without counsel/privacy review.
6. **Eradicate and recover:** correct the cause, peer-review the change, restore into an isolated target if needed, run migrations/invariants/smoke checks, and obtain incident-commander approval before reopening traffic.
7. **Notify:** security/privacy and counsel determine contractual, regulatory, insurer, law-enforcement, and affected-party duties and deadlines. Record the decision and supporting facts.
8. **Close and learn:** issue an internal post-incident review covering timeline, root cause, impact, detection, response, corrective actions, owners, and dates. Track actions to verified completion.

## Suspected credential or session compromise

- Disable the account and use administrator session revocation.
- Unlock login only after identity verification and password reset.
- Review immutable audit events for the hospital, affected account, administrator actions, exports, and configuration changes.
- Rotate `SESSION_SECRET` only under a coordinated all-user logout plan; rotate `CRON_SECRET` and provider credentials independently when implicated.
- Review object-storage access logs separately because credential-file retrieval crosses application and storage controls.

## Exercises and retained evidence

Run a tabletop before the first pilot and at least annually, plus a technical restore exercise on the agreed cadence. Retain the alert, incident record, UTC timeline, decisions, communications, evidence locations, recovery checks, post-incident review, and corrective-action verification according to the approved retention policy.
