# Founder External Readiness Workbook

Last updated: November 2, 2026

This workbook converts the remaining hospital-launch work into decisions, owners, budgets, and retained evidence. It is operational planning, not legal, insurance, accounting, or regulatory advice. Replace every `TBD` and obtain qualified professional review before making regulated-data or contractual commitments.

## Working assumptions

- Company status: **TBD** (assumed formed or formation underway)
- Initial operating owner: **Founder / TBD**
- First-pilot infrastructure budget: **$500–$1,500/month planning range**
- Hosting architecture: Render web/PostgreSQL, private S3-compatible credential storage, Expo/EAS mobile builds
- Launch boundary: synthetic staging data only until legal, security, insurance, recovery, and customer approvals are complete

## 1. Company foundation

Complete these before signing hospital contracts or placing vendor accounts under the company.

| Decision/evidence | Owner | Target date | Status/location |
| --- | --- | --- | --- |
| Legal entity name, type, state, formation documents | Founder + business counsel | TBD | TBD |
| EIN/tax registrations and business bank account | Founder + accountant | TBD | TBD |
| Founder/contractor IP assignments covering source, brand, and designs | Counsel | TBD | TBD |
| Trademark/name/domain review for “Stat Workforce” | Trademark counsel | TBD | TBD |
| Accounting system, chart of accounts, and expense-approval process | Founder + accountant | TBD | TBD |
| Company mailing address and registered-agent decision | Founder + counsel | TBD | TBD |

Do not put SSNs, banking credentials, formation secrets, or signed legal documents in this repository.

## 2. Company-owned account inventory

Use a company email domain, company billing method, password manager, MFA, two recovery owners, and least-privilege user accounts. Never leave the only recovery method on one personal phone/email.

| System | Purpose | Primary owner | Backup owner | Billing owner | MFA/recovery verified | Evidence location |
| --- | --- | --- | --- | --- | --- | --- |
| Domain registrar/DNS | Domain and DNS control | TBD | TBD | TBD | [ ] | TBD |
| Google Workspace or Microsoft 365 | Company identity/email | TBD | TBD | TBD | [ ] | TBD |
| 1Password/Bitwarden business | Secrets and recovery | TBD | TBD | TBD | [ ] | TBD |
| GitHub organization | Source, PRs, CI, Dependabot | TBD | TBD | TBD | [ ] | TBD |
| Render | Staging/production web and PostgreSQL | TBD | TBD | TBD | [ ] | TBD |
| AWS or approved S3 provider | Private credential documents | TBD | TBD | TBD | [ ] | TBD |
| Expo/EAS | Mobile builds and updates | TBD | TBD | TBD | [ ] | TBD |
| Apple Developer | Managed iOS distribution | TBD | TBD | TBD | [ ] | TBD |
| Google Play Console | Managed Android distribution | TBD | TBD | TBD | [ ] | TBD |
| Monitoring/error service | Errors, logs, paging | TBD | TBD | TBD | [ ] | TBD |
| Uptime/status service | Independent probes/status | TBD | TBD | TBD | [ ] | TBD |
| Support/ticket system | Authenticated customer support | TBD | TBD | TBD | [ ] | TBD |
| Accounting/banking | Bills, collections, audit trail | TBD | TBD | TBD | [ ] | TBD |
| E-signature/contract repository | Controlled agreements | TBD | TBD | TBD | [ ] | TBD |

Account-opening order: company domain/email → password manager → GitHub/banking/accounting → cloud/storage/monitoring → Expo/Apple/Google → support/contracts.

## 3. Financial authorization

These are proposed controls for a founder-led pilot. Approve or replace them in writing.

| Commitment | Proposed authority | Evidence |
| --- | --- | --- |
| Recurring tool under $250/month | Founder approval recorded in expense system | Receipt + business purpose |
| Recurring tool $250–$1,500/month | Founder approval plus quarterly review date | Quote/order form + cancellation terms |
| Any annual/prepaid commitment | Founder plus accountant/counsel review as applicable | Signed order form + renewal owner |
| Contract over $5,000 or containing customer-data duties | Counsel review before signature | Approved redline + signature authority |
| Production infrastructure change | Technical owner plus rollback/recovery evidence | Change/release record |
| Insurance purchase/coverage change | Founder plus licensed broker | Binder/policy + exclusions review |

### Pilot planning ranges—not quotes

- Hosting/database/storage/monitoring/support: approximately **$500–$1,500/month** for a controlled pilot, depending on availability and retention.
- Legal formation and initial contract/privacy package: obtain scoped proposals; planning reserves often reach **several thousand to tens of thousands of dollars**.
- Independent penetration testing: obtain at least two comparable scopes; a credible web/mobile/cloud engagement commonly requires a **five-figure reserve**.
- Cyber/E&O insurance: obtain broker quotes based on revenue, limits, hospital requirements, and prior-acts/exclusions.

Verify current vendor pricing and taxes before approval. Do not treat these planning ranges as offers.

## 4. Named personnel and interim assignments

One person may temporarily hold multiple roles, but every role needs a named backup and conflicts must be visible.

| Role | Primary | Backup | Required before |
| --- | --- | --- | --- |
| Executive/product owner | Founder / TBD | TBD | Account creation |
| Technical/deployment owner | TBD | TBD | Staging deployment |
| Security/privacy lead | TBD | TBD | Vendor-risk submission |
| Incident commander | TBD | TBD | External staging |
| Customer communications lead | TBD | TBD | Pilot kickoff |
| Support/on-call lead | TBD | TBD | User onboarding |
| Clinical/workforce advisor | TBD | TBD | Workflow approval |
| Legal counsel | TBD | TBD | Contracts/privacy/BAA |
| Accountant/tax advisor | TBD | TBD | Billing/collections |
| Insurance broker | TBD | TBD | Hospital procurement |
| Independent penetration tester | TBD | TBD | Production approval |

No pilot goes live while incident commander, technical backup, hospital escalation contact, or after-hours decision authority is blank.

## 5. Legal and privacy decision register

Counsel should produce or approve the final documents and explain which party is controller, processor, covered entity, or business associate for each data flow.

| Decision | Options to resolve | Owner/status |
| --- | --- | --- |
| BAA position | Required, not required, or customer-specific based on actual PHI/ePHI handling | Counsel / TBD |
| Data minimization | Workforce-only data; prohibit patient clinical data unless separately designed/approved | Privacy lead / TBD |
| Subscription agreement | Term, fees, warranties, limits, indemnity, security exhibit, suspension, termination | Counsel / TBD |
| Privacy notice | Workforce users, mobile permissions, support/telemetry, rights/contact process | Counsel / TBD |
| Data-processing terms | Subprocessors, locations, security measures, assistance, deletion/return | Counsel / TBD |
| Retention schedule | Per data class, backups, audit, incidents, support, legal holds | Hospital + counsel / TBD |
| Breach/security notification | Definition, decision authority, timing, evidence, customer contacts | Counsel/privacy / TBD |
| Mobile terms | Internal managed distribution versus public stores; acceptable-use language | Counsel / TBD |
| Accessibility position | Testing evidence, customer requirements, remediation channel | Product/counsel / TBD |
| AI statement | Current product does not use an LLM for staffing decisions; future AI requires separate review | Product / TBD |

## 6. Insurance and hospital procurement

Ask a licensed broker about technology E&O, cyber/privacy liability, general liability, crime/social-engineering coverage, workers compensation if applicable, and directors/officers coverage. Review exclusions for unencrypted devices, subcontractors, prior acts, contractual liability, regulatory proceedings, and failure to maintain security controls.

Prepare this evidence package:

- Certificate of insurance and policy limits matching the hospital contract
- Subprocessor/vendor list and data-flow/architecture diagram
- Security assessment and remediation report
- Backup/restore and incident exercise evidence
- Access control, secure development, vulnerability, retention/deletion, and incident policies
- Business continuity/support contacts and response targets
- Privacy/BAA/subscription documents approved by counsel
- Financial/vendor forms, tax form, company registration, and authorized signer

## 7. Independent reviewer selection

### Penetration tester

Request at least two proposals using `SECURITY_ASSESSMENT_SCOPE.md`. Require healthcare SaaS, multi-tenant web/API, mobile, AWS/object-storage, and authorization-testing experience; tester independence; named methodology; safe rules of engagement; encrypted evidence; critical finding escalation; remediation retest; and final evidence deletion.

### Legal counsel

Seek counsel with healthcare technology transactions, HIPAA/business-associate analysis, SaaS licensing, privacy, security incidents, and hospital procurement experience. Ask for a scoped fixed-fee or phased estimate and identify the responsible attorney—not only the firm name.

### Insurance broker

Use a broker experienced with healthcare SaaS and hospital vendor requirements. Give them the actual product/data flow and proposed contract, not only a generic software questionnaire.

### Clinical/workforce reviewer

Use an experienced hospital staffing/scheduling leader who is independent of product sales. Have them review terminology, approvals, union/seniority/rest/overtime assumptions, credential workflows, escalation, and training materials.

## 8. 30-day execution sequence

### Days 1–3

- Confirm entity, company domain/email, banking/billing authority, and password manager.
- Name primary/backup technical, security/privacy, incident, and support owners.
- Inventory or transfer every vendor account into company control.

### Days 4–10

- Engage healthcare SaaS counsel, accountant, insurance broker, and clinical advisor.
- Apply the staging Blueprint; configure secrets/object storage/monitoring.
- Configure GitHub staging environment and run remote validation.

### Days 11–20

- Obtain contract/privacy/BAA/retention drafts and insurance quotes.
- Obtain penetration-test proposals and schedule the selected reviewer.
- Create EAS internal builds and complete physical-device/cross-browser tests.
- Run managed backup/PITR restoration and incident tabletop.

### Days 21–30

- Remediate/retest findings; complete hospital vendor-risk responses.
- Finalize pilot scope, owners, success measures, training, support, parallel run, cutover, and rollback.
- Collect written security, legal, technical, clinical, and executive go-live approvals.

## Founder decisions needed now

1. Exact legal company name, entity type, formation state, and status.
2. Company email domain and who controls it.
3. Names/emails for the primary and backup account owners.
4. Approved monthly pilot operating budget and one-time legal/security reserve.
5. Existing Render, AWS, Expo, Apple, Google, GitHub, monitoring, banking, and insurance accounts.
6. Counsel, broker, accountant, clinical advisor, and penetration tester already engaged—if any.
7. Whether the first mobile pilot uses managed internal distribution only.
8. Whether the pilot will intentionally receive PHI/ePHI; recommended default is **no** unless separately approved.
