# Administrator and Manager Boundary Decision

Status: accepted for pilot architecture  
Date: October 31, 2026

Administrators do not enter `/manager/*` web dashboards and do not impersonate a unit manager. The web proxy redirects an administrator who requests a manager page to `/unauthorized`. This keeps routine unit workflow, navigation, and accountability distinct from hospital administration.

Administrators retain hospital-wide access to the manager API/data layer for explicit oversight functions used by the role-aware mobile application and administrative operations. Those calls revalidate the database-backed administrator session, remain scoped to the administrator's hospital, and are auditable where they mutate state. They are not a tenant-boundary bypass and do not permit access to another hospital.

If a hospital wants an administrator to perform routine unit-manager work, provision a separate named manager account or change the authorization model through a reviewed product decision. Do not add silent administrator impersonation or a client-side role switch.

Regression coverage verifies both sides of this decision: administrator web access to `/manager` is denied, while an authenticated administrator can retrieve the hospital-scoped manager schedule API used for oversight.
