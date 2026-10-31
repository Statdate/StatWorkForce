# Pilot Support Operations

Last updated: October 31, 2026

## Proposed support model

During a controlled pilot, provide one named hospital project lead and one Stat Workforce support owner. Use a private support channel that can authenticate the requester; never accept passwords, access tokens, credential files, or workforce exports by ordinary email.

The severity and response targets in the incident runbook are proposed planning values. Final coverage hours, holidays, response/restoration targets, escalation paths, and service credits must be approved in the subscription agreement. Do not promise 24/7 coverage until staffing and an on-call rotation exist.

## Intake checklist

- Requester, hospital, callback channel, and authority verified
- UTC detection time, affected environment, unit/function, and user count
- Steps, expected/actual result, frequency, and safe screenshots with sensitive data removed
- Workaround and operational/clinical scheduling impact
- Suspected privacy, security, integrity, or availability event escalated immediately
- Severity, owner, next update time, and customer ticket reference assigned

## Routine operating cadence

- Daily during launch: deployment, error, uptime, push-delivery, credential-sweep, and open-incident review
- Weekly during pilot: adoption, scheduling exceptions, support trends, unresolved risks, and success-metric review
- Monthly: access/administrator review, dependency and vulnerability review, backup evidence, capacity trend, and corrective actions
- Quarterly or contracted cadence: restore test, session/secret rotation review, incident exercise, vendor review, and customer service review

## Escalation gate

Any suspected unauthorized access, data disclosure, destructive change, widespread outage, or loss of audit/backup capability moves out of ordinary support and into the incident response runbook. Support personnel preserve the initial report and stop requesting additional sensitive data until the incident commander provides a secure collection method.
