---
title: "Stat Workforce"
subtitle: "Customer Education, Pricing, and Hospital Sales Playbook"
author: "Stat Workforce"
date: "October 2026"
---

# Executive summary

Stat Workforce is a hospital workforce operations platform that brings scheduling, open-shift pickup, time-off workflows, timekeeping oversight, credential tracking, manager-to-worker communication, and operational audit history into one system.

The product is designed around the way hospitals actually operate: a hospital contains units, workers may belong to one or more units, managers oversee defined scopes, and administrators need hospital-wide visibility without exposing one hospital's information to another.

The commercial goal is not to sell “another calendar.” The value proposition is safer staffing operations, less manual coordination, faster shift coverage, better credential visibility, and a defensible record of important workforce actions.

> **Recommended positioning:** “Stat Workforce gives nursing operations one reliable place to schedule staff, fill open shifts, monitor credentials, and document workforce decisions.”

# Who this packet is for

Use this packet to educate:

- Chief Nursing Officers and nursing executives
- Hospital operations and workforce-management leaders
- Nursing unit directors and managers
- Human resources and credentialing teams
- Information technology, security, and compliance reviewers
- Finance and procurement teams
- Frontline clinical workers

# The problem Stat Workforce solves

Hospitals often coordinate workforce operations through a mixture of legacy scheduling software, spreadsheets, email, text messages, paper, and tribal knowledge. That fragmentation creates recurring problems:

- Managers spend too much time locating available staff.
- Workers cannot easily see schedules, open shifts, or request time away.
- Credential expirations are discovered late.
- Decisions and approvals are difficult to reconstruct.
- Staff data is duplicated across systems.
- Hospital leaders lack a single operational view.
- Manual handoffs create avoidable staffing and compliance risk.

Stat Workforce creates a shared operational layer without requiring every stakeholder to use the same screen or workflow.

# How the platform works

## Hospital and unit structure

Each customer is represented as an isolated hospital organization. Units belong to the hospital, and users receive role- and unit-based access. Hospital codes disambiguate users whose badge numbers may overlap across customer organizations.

## User roles

### Workers

Workers can:

- View their schedule and open shifts
- Request eligible open shifts
- Submit time-off requests
- Review credentials and expiration status
- Upload supporting credential documents
- Receive in-app and mobile notifications
- Communicate with their managers
- Synchronize published schedules to a calendar

### Managers

Managers can:

- View staffing within their assigned units
- Offer shifts to eligible workers
- Review shift-pickup requests
- Review time-off requests
- Review time entries
- Monitor unit credential status
- Communicate with unit workers
- Publish schedule periods

### Administrators

Administrators can:

- View hospital-wide units and workforce information
- Monitor credentials across the organization
- Activate or deactivate users
- Revoke active user sessions
- Review immutable audit history
- Export audit information
- Monitor notification-delivery health

## Scheduling lifecycle

1. A schedule period and its shifts are prepared.
2. Managers assign or offer shifts within their authorized scope.
3. Workers see open opportunities and submit pickup requests.
4. Managers approve or decline pending pickups.
5. The schedule is published.
6. Workers receive notifications and can synchronize published schedules.
7. Changes and approvals are retained in operational and audit records.

## Credential lifecycle

1. A worker adds a professional credential and expiration date.
2. The worker uploads an approved supporting file type.
3. Managers and administrators see status within their authorized scope.
4. The system generates advance expiration reminders for the worker and relevant managers.
5. Delivery attempts are tracked and retried instead of silently discarded.
6. A renewed credential replaces the previous document and expiration details.

## Security and accountability

The current platform includes:

- Hospital-aware authentication
- Hospital and unit authorization enforcement
- Durable login throttling
- Immediate session revocation
- User deactivation controls
- Tenant-integrity enforcement in the database
- Append-only audit records protected from update and deletion
- Hospital-scoped audit export
- Optional object storage for credential documents
- Health checks and automated build validation
- Durable notification delivery with retry tracking

These controls support a hospital security review, but they are not by themselves a certification. Before handling production protected health information or other regulated data, complete formal legal, security, privacy, disaster-recovery, penetration-testing, and vendor-risk processes.

Implementation is governed by the repository's hospital pilot implementation plan, with explicit discovery, configuration, testing, training, parallel-run, cutover, stabilization, and expansion/closure gates. Customer data retention, return, and deletion are finalized during contracting using the draft data lifecycle standard; they should never be improvised during termination.

# What customers should be taught

## Executive education: 20 minutes

Focus on outcomes rather than screens:

1. How much manager time is spent filling shifts today?
2. How many systems are involved in schedule and credential coordination?
3. How quickly can leadership identify uncovered shifts or expiring credentials?
4. Can the organization reconstruct who approved an important change?
5. What is the financial impact of agency labor, overtime, and administrative work?

Demonstrate one complete story: an open shift becomes available, a worker requests it, a manager approves it, the worker is notified, and the decision is recorded.

## Manager training: 60 minutes

- Navigate the assigned unit
- Understand draft versus published schedules
- Offer shifts and review pickup requests
- Review time off and time entries
- Monitor credentials and alerts
- Send messages without bypassing unit boundaries
- Escalate errors and document exceptions

End with scenario practice, not a feature quiz.

## Worker training: 30 minutes

- Sign in using hospital code, badge number, and password
- Review the schedule
- Request an open shift
- Submit or withdraw an eligible time-off request
- Review and update credentials
- Read notifications and messages
- Explain whom to contact when app data differs from the official staffing decision

## Administrator training: 90 minutes

- Hospital-wide visibility and access boundaries
- User lifecycle and session revocation
- Credential oversight
- Audit review and export
- Notification-delivery monitoring
- Support escalation, incident response, and change control

## IT and security workshop: 90 minutes

- Hosting architecture and deployment ownership
- Identity strategy and future SSO integration
- Database isolation and authorization model
- Encryption, secrets, logging, and document storage
- Backup, recovery, monitoring, and incident contacts
- Data retention and deletion requirements
- Integration roadmap and change-management process

# Recommended customer rollout

## Phase 1: discovery and readiness — 2 to 4 weeks

- Identify executive sponsor, clinical owner, IT owner, and project manager.
- Map units, roles, shift types, scheduling rules, credentials, and approval paths.
- Document integrations and data migration requirements.
- Agree on success metrics and baseline values.
- Complete security and vendor-risk intake.

## Phase 2: paid pilot — 6 to 10 weeks

Start with one or two units and approximately 50 to 200 workers. Configure the organization, train champions, import approved data, run workflow simulations, and then operate in parallel with the existing source of truth for a defined period.

Suggested pilot success measures:

- Manager hours spent filling open shifts
- Median time from open shift to confirmed coverage
- Percentage of active workers with complete credential records
- Credential expirations identified before deadline
- Worker adoption and weekly active use
- Support incidents per 100 users
- Notification-delivery success
- Schedule corrections after publication

## Phase 3: controlled expansion — 8 to 16 weeks

Expand in cohorts, usually by service line or facility. Hold a readiness review before each cohort, train local champions, and maintain an agreed rollback procedure.

## Phase 4: enterprise operations

Move to formal service governance: quarterly business reviews, release communications, security reviews, support metrics, adoption reporting, and roadmap prioritization.

# Proposed pricing structure

The following is a launch recommendation for customer discovery. It should be tested through real buyer conversations and adjusted for support burden, integration complexity, hosting costs, insurance, and competitive response.

| Plan | Best for | Annual platform fee | Included active workers | Additional workers | Core scope |
|---|---|---:|---:|---:|---|
| Pilot | One or two units proving value | $15,000 for up to 90 days | 200 | Custom | Configured pilot, training, success review |
| Essential | Community hospitals or a limited service line | $36,000/year | 300 | $7/user/month | Scheduling, open shifts, time off, messaging, core reporting |
| Professional | Mid-size hospitals | $72,000/year | 750 | $6/user/month | Essential plus credentials, mobile workflows, audit export, delivery monitoring |
| Enterprise | Large hospitals and multi-facility systems | Starting at $150,000/year | 2,000 | Negotiated | Professional plus SSO/integration package, advanced governance, priority support |

“Active worker” should mean a unique enabled user during the billing month. Managers and administrators can either be included or counted as active workers; pick one rule and use it consistently in every contract.

## One-time services

| Service | Recommended price |
|---|---:|
| Essential implementation | $12,000 |
| Professional implementation | $25,000 |
| Enterprise implementation | Starting at $50,000 |
| Additional data migration | $175/hour or fixed statement of work |
| Custom integration | Starting at $15,000 per integration |
| On-site training | $3,500/day plus travel |
| Additional remote training | $1,500/session |

## Optional add-ons

- Premium support and defined response targets: 15% to 20% of annual subscription
- Dedicated customer environment: starting at $24,000/year
- Advanced analytics: starting at $18,000/year
- Additional facility under an enterprise agreement: negotiated by size
- Custom workflow development: statement of work

## Commercial rules

- Require a paid pilot; credit 50% to 100% of the pilot fee toward year one when the customer signs within 30 days.
- Prefer annual prepayment. Offer quarterly payment only when needed for procurement.
- Use three-year terms for enterprise customers, with a defined annual increase of 3% to 5%.
- Do not discount implementation unless scope is reduced.
- Exchange discounts for something valuable: longer term, prepayment, reference rights, rapid signature, or limited customization.
- Cap first-year subscription discounts at approximately 15% without executive approval.
- Never promise an integration, certification, uptime level, or feature that is not contractually scoped and operationally supportable.

# How to calculate and present ROI

Build the business case from the hospital's own baseline rather than generic industry claims.

## Annual value model

**Administrative savings** = manager hours saved per week × loaded hourly cost × 52

**Premium labor opportunity** = avoidable agency/overtime hours × average incremental hourly premium

**Credential-risk opportunity** = preventable late renewals × estimated administrative or staffing impact

**Total quantified opportunity** = administrative savings + premium labor opportunity + other agreed savings

**First-year ROI** = (quantified benefit − first-year subscription and implementation) ÷ first-year cost

Example for illustration only:

- 15 managers save 3 hours per week at a $65 loaded hourly cost: $152,100/year
- 100 premium labor hours per month avoided at a $40 incremental premium: $48,000/year
- Total modeled benefit: $200,100/year
- Professional subscription plus implementation: $97,000 in year one
- Illustrative first-year net benefit: $103,100

Label all examples as illustrations until the customer validates the inputs.

# Sales strategy

## Ideal initial customer

Target independent or regional hospitals where:

- Nursing leaders can sponsor a pilot.
- Scheduling or credential coordination is visibly manual.
- One or two units can pilot without an enterprise-wide replacement decision.
- The customer values responsiveness and workflow flexibility.
- Procurement can approve a defined paid pilot.

Avoid leading with the largest health systems until security operations, support coverage, integrations, implementation staffing, insurance, and references are mature enough for their procurement process.

## Buyer map

| Stakeholder | Primary concern | Message |
|---|---|---|
| CNO | Safe staffing and retention | Faster visibility and less coordination friction |
| Unit director | Daily execution | One workflow for shifts, requests, alerts, and records |
| CFO/finance | Cost and predictability | Measurable manager time and premium-labor opportunity |
| CIO/IT | Architecture and support | Defined deployment, access boundaries, monitoring, and roadmap |
| Security/privacy | Risk | Tenant controls, auditability, session controls, and formal review readiness |
| HR/credentialing | Workforce readiness | Earlier visibility into missing and expiring credentials |
| Workers | Ease and fairness | Mobile access, transparent opportunities, and clear request status |

## Sales stages

1. **Qualification:** confirm operational pain, sponsor, timeline, worker count, current tools, and procurement path.
2. **Discovery:** document current workflow and quantify baseline metrics.
3. **Role-based demonstration:** show the customer's workflow rather than every feature.
4. **Technical validation:** conduct IT/security review and identify integrations.
5. **Paid pilot proposal:** define units, users, dates, responsibilities, and success measures.
6. **Pilot execution:** report adoption and operational outcomes weekly.
7. **Business review:** compare results to baseline and propose expansion.
8. **Annual agreement:** finalize subscription, implementation, support, security, and data terms.

## Discovery questions

- How is the schedule created, approved, published, and changed today?
- What happens when a shift opens unexpectedly?
- How many calls, texts, or messages are typically needed to fill it?
- How much manager time is spent on staffing coordination each week?
- How are credential expirations tracked and escalated?
- Which system is the official source of worker and unit data?
- Which unions, policies, seniority rules, or overtime rules affect scheduling?
- What must integrate at launch versus after a pilot?
- What security, privacy, legal, and insurance reviews are required?
- What outcome would make a pilot an obvious success?

## Recommended 30-minute demo

1. Two-minute statement of the customer's problem.
2. Worker views schedule and requests an open shift.
3. Manager reviews and approves the request.
4. Show the resulting worker notification.
5. Show credential status and an expiration alert.
6. Show administrator audit and delivery monitoring.
7. Return to outcomes, pilot scope, and next decision.

# Objection handling

**“We already have a scheduling system.”**  
Ask where the current system is working and where teams still use spreadsheets, texts, or manual credential tracking. Position a pilot around a verified gap, not an unnecessary replacement.

**“You are a young company.”**  
Do not evade the concern. Offer a controlled paid pilot, transparent security documentation, defined exit and data-export terms, reference architecture, and measurable acceptance criteria.

**“We cannot take implementation risk.”**  
Use a limited-unit rollout, parallel operations, named owners, readiness gates, training, rollback criteria, and a written responsibility matrix.

**“The price is too high.”**  
Return to the customer's quantified baseline. Reduce scope before reducing value. Compare cost with manager time, premium labor, fragmented tools, and operational risk—without claiming guaranteed savings.

**“Does it integrate with our HR, payroll, or identity system?”**  
Document the exact system, data direction, frequency, ownership, and launch requirement. Do not describe roadmap capability as delivered functionality.

**“Is it HIPAA compliant?”**  
Explain the current security controls and intended data minimization, then state that compliance depends on the complete deployed service, policies, contracts, vendors, operations, and customer configuration. Complete the customer's formal review and execute required agreements before regulated production use.

# Materials to prepare before active selling

- One-page executive overview
- Five-minute product video
- Role-based demonstration environment
- Architecture and data-flow diagram
- Security overview and completed standard questionnaire
- Privacy policy, terms, subscription agreement, and data-processing terms
- Business associate agreement position reviewed by counsel
- Incident-response and breach-notification procedure
- Backup, recovery, availability, and support policy
- Implementation statement-of-work template
- Pilot proposal and success-scorecard template
- Customer reference and case study after the first successful pilot
- Product roadmap with delivered, committed, and exploratory items clearly separated

# 90-day go-to-market plan

## Days 1–30: package the offer

- Confirm the ideal customer profile and pilot scope.
- Interview at least 10 nursing or workforce leaders.
- Test the proposed pricing without immediately discounting.
- Finish sales, security, legal, and implementation templates.
- Create a stable demonstration environment and scripted demo.
- Build a list of 50 qualified regional targets.

## Days 31–60: create pipeline

- Ask advisors and clinical contacts for warm introductions.
- Run role-specific discovery calls.
- Demonstrate only after confirming pain and decision process.
- Seek three qualified pilot opportunities.
- Record objections and update messaging weekly.

## Days 61–90: close the first pilot

- Select the customer with the clearest sponsor and manageable scope.
- Complete security and procurement work honestly.
- Sign a paid pilot with defined success metrics.
- Establish weekly operating reviews.
- Prepare expansion pricing before the final pilot review.

# Customer-facing closing statement

“Stat Workforce is built to make hospital workforce operations easier to see, easier to act on, and easier to defend. We recommend starting with a controlled paid pilot in one or two units, measuring the operational impact together, and expanding only when the evidence supports it.”

# Important commercial disclaimer

This packet is a business and product planning document, not legal, compliance, accounting, or clinical advice. Pricing is proposed positioning and should be validated against delivery costs, market interviews, procurement feedback, and counsel-reviewed contracts. Product claims must be updated as functionality, certifications, hosting, integrations, and operational capabilities change.
