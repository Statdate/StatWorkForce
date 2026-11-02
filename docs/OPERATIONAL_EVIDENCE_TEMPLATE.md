# Operational Readiness Evidence

Copy this template into the controlled customer implementation record for each environment. Do not commit credentials, connection strings, access tokens, workforce exports, or credential documents to Git.

## Release

- Environment and public hostname:
- Git commit SHA and container/image digest:
- Change approval and approvers:
- Deployment operator and UTC timestamp:
- Migration output location:
- CI, dependency audit, and smoke-test evidence:
- Rollback owner and prior known-good release:

## Backup and recovery drill

- Source environment and managed database provider:
- Isolated restore target identifier:
- Backup type and UTC creation time:
- Restore start/end time and measured recovery time:
- Table and migration counts matched:
- Application smoke test against restored database:
- Point-in-time recovery/retention configuration reviewed:
- Evidence location, operator, and independent reviewer:
- Exceptions, remediation owner, and due date:

Run the logical drill only against an isolated disposable target:

```bash
DATABASE_URL='<source>' \
RESTORE_DATABASE_URL='<disposable-target>' \
ACKNOWLEDGE_RESTORE_TARGET_REPLACEMENT=YES \
npm run db:restore-drill
```

The command deliberately replaces the `public` schema in `RESTORE_DATABASE_URL`. It refuses to run when the source and target URLs are identical or the explicit acknowledgement is absent.

## Monitoring and response

- Uptime/error/database monitors and alert links:
- Primary and backup alert owners:
- Support hours and severity response targets:
- Incident commander and customer communication owner:
- Last alert-delivery test and result:
- Last incident exercise and corrective actions:

## Customer go-live

- Customer executive, clinical, IT, and project owners:
- Approved units and worker population:
- Training completion evidence:
- Data validation and parallel-run result:
- Security, legal, privacy, and BAA approvals:
- Written go-live approval and UTC timestamp:
