# Hospital Pilot Implementation Plan

Last updated: October 31, 2026

Copy this plan into the controlled customer project workspace and replace every `TBD`. The pilot cannot move to the next phase until its exit criteria are approved.

## Ownership

| Role | Hospital owner | Stat Workforce owner |
| --- | --- | --- |
| Executive sponsor | TBD | TBD |
| Clinical/workforce owner | TBD | TBD |
| IT/security owner | TBD | TBD |
| Project manager | TBD | TBD |
| Data/integration lead | TBD | TBD |
| Training/change lead | TBD | TBD |
| Go-live incident lead | TBD | TBD |

## Scope and success measures

- Pilot units, job types, worker count, manager count, and shift volume: TBD
- In scope: scheduling, self-service, time off, credentials, messaging, notifications (select and amend)
- Out of scope and manual workarounds: TBD
- Baseline period and source: TBD
- Target schedule-fill time, open-shift fill rate, manager hours saved, overtime exceptions, credential compliance, adoption, and support volume: TBD
- Pilot start, stabilization period, measurement date, and expansion decision date: TBD

## Phase 1 — discovery and design

- Document union/seniority, rest, overtime, staffing-ratio, approval, and schedule-publication rules.
- Identify authoritative HR, identity, payroll, credential, unit, and job-type sources.
- Decide required integrations versus controlled manual imports for the pilot.
- Complete workflow mapping, data inventory, vendor-risk/security review, accessibility needs, and legal/BAA decision.

**Exit:** signed scope, owners, success measures, data flow, integration decision, and unresolved-risk register.

## Phase 2 — configuration and validation

- Configure isolated staging hospital, units, job types, credential requirements, time zone, week start, and workload warning threshold.
- Provision named administrators/managers with least privilege; require temporary-password replacement.
- Load synthetic data first, then validate any approved customer data through a documented reconciliation.
- Execute unit, role, browser, device, load, security, backup/restore, monitoring, and notification tests.

**Exit:** test evidence approved by clinical, IT/security, project, and product owners with no unaccepted critical defects.

## Phase 3 — training and parallel run

- Train administrators and unit champions, then managers and workers.
- Use role-based scenarios: login/security, schedule review/publish, shift signup, time off, credentials/documents, messages, alerts, and support escalation.
- Run the existing scheduling process and Stat Workforce in parallel for the agreed cycles.
- Reconcile staffing, assignments, exceptions, and credential status daily; record discrepancies and owners.

**Exit:** training completion, adoption readiness, reconciled parallel-run result, support roster, and approved cutover/rollback plan.

## Phase 4 — cutover and stabilization

- Freeze configuration changes, confirm backup and restore point, validate monitors, and publish the go-live communication.
- Deploy the exact staging-approved commit and configuration; run health, smoke, and role checks.
- Obtain written go-live approval from hospital and Stat Workforce owners.
- Operate the launch command channel and daily metrics/incident review through stabilization.

**Rollback triggers:** unreconciled assignment integrity, authorization boundary failure, unavailable audit trail, unrecoverable notification failure, security/privacy incident, or sustained service failure beyond the approved threshold.

## Phase 5 — measure and decide

- Compare success measures with the signed baseline.
- Review adoption, support, security, reliability, data quality, workflow exceptions, and customer feedback.
- Decide: stop and remove data, extend the controlled pilot, remediate before continuation, or approve phased expansion.
- Record data export/return and deletion duties for any stop or contract termination.

## Required approvals

| Gate | Hospital approver/date | Stat Workforce approver/date | Evidence link |
| --- | --- | --- | --- |
| Scope/design | TBD | TBD | TBD |
| Security/legal/data | TBD | TBD | TBD |
| Test and parallel run | TBD | TBD | TBD |
| Go-live | TBD | TBD | TBD |
| Expansion/closure | TBD | TBD | TBD |
