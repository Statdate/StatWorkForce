import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const organizationCode = process.env.SMOKE_ORG_CODE ?? "kaiser-la";
const workerBadge = process.env.SMOKE_WORKER_BADGE ?? "30001";
const workerPassword = process.env.SMOKE_WORKER_PASSWORD ?? "Password123!";
const adminBadge = process.env.SMOKE_ADMIN_BADGE ?? "10001";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? "Password123!";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function login(badgeNumber, password) {
  const result = await request("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationCode,
      badgeNumber,
      password,
    }),
  });
  assert.equal(result.response.status, 200, `synthetic login ${badgeNumber} should succeed`);
  assert.equal(typeof result.body?.token, "string", "login should return a token");
  return result.body.token;
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

const liveness = await request("/api/health/live");
assert.equal(liveness.response.status, 200, "liveness endpoint should succeed");
assert.deepEqual(liveness.body, { status: "alive" });
assert.equal(liveness.response.headers.get("cache-control"), "no-store");

const health = await request("/api/health");
assert.equal(health.response.status, 200, "readiness endpoint should succeed");
assert.deepEqual(health.body, { status: "ok" });
assert.equal(health.response.headers.get("cache-control"), "no-store");
assert.equal(health.response.headers.get("x-content-type-options"), "nosniff");
assert.equal(health.response.headers.get("x-frame-options"), "DENY");
assert.match(health.response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
assert.equal(health.response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

const unauthenticated = await request("/api/me");
assert.equal(unauthenticated.response.status, 401, "protected API should reject anonymous access");

const wrongHospital = await request("/api/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    organizationCode: `wrong-hospital-${Date.now()}`,
    badgeNumber: workerBadge,
    password: workerPassword,
  }),
});
assert.equal(wrongHospital.response.status, 401, "tenant-qualified login must reject a wrong hospital");

const workerToken = await login(workerBadge, workerPassword);
const workerProfile = await request("/api/me", { headers: bearer(workerToken) });
assert.equal(workerProfile.response.status, 200);
assert.equal(workerProfile.body?.accountType, "WORKER");
assert.equal(workerProfile.body?.badgeNumber, workerBadge);

const workerSchedule = await request("/api/schedule", { headers: bearer(workerToken) });
assert.equal(workerSchedule.response.status, 200, "worker schedule should load");
assert.ok(Array.isArray(workerSchedule.body?.assignments));

const workerAuditAttempt = await request("/api/admin/audit-logs?limit=1", {
  headers: bearer(workerToken),
});
assert.equal(workerAuditAttempt.response.status, 403, "worker must not access admin audit data");

const workerExportAttempt = await request("/api/admin/data-export", {
  headers: bearer(workerToken),
});
assert.equal(workerExportAttempt.response.status, 403, "worker must not export hospital data");
const workerDocumentExportAttempt = await request("/api/admin/credential-documents-export", {
  headers: bearer(workerToken),
});
assert.equal(workerDocumentExportAttempt.response.status, 403, "worker must not export credential documents");

const workerManagerAttempt = await request("/api/manager/schedule", {
  headers: bearer(workerToken),
});
assert.equal(workerManagerAttempt.response.status, 403, "worker must not access manager scheduling data");

const adminToken = await login(adminBadge, adminPassword);
const adminAudit = await request("/api/admin/audit-logs?limit=1", {
  headers: bearer(adminToken),
});
assert.equal(adminAudit.response.status, 200, "admin audit endpoint should load");
assert.ok(Array.isArray(adminAudit.body?.items));
const adminManagerOversight = await request("/api/manager/schedule", { headers: bearer(adminToken) });
assert.equal(adminManagerOversight.response.status, 200, "administrator should retain hospital-scoped manager API oversight");
assert.ok(Array.isArray(adminManagerOversight.body?.shifts));

const adminExport = await request("/api/admin/data-export", { headers: bearer(adminToken) });
assert.equal(adminExport.response.status, 200, "administrator hospital export should succeed");
assert.equal(adminExport.response.headers.get("cache-control"), "private, no-store");
assert.equal(adminExport.body?.schemaVersion, 1);
assert.ok(Array.isArray(adminExport.body?.data?.users));
const serializedExport = JSON.stringify(adminExport.body);
for (const excludedField of ["passwordHash", "sessionVersion", "expoPushToken", "fileData", "storageKey", "pushLastError"]) {
  assert.equal(serializedExport.includes(`\"${excludedField}\"`), false, `export must exclude ${excludedField}`);
}

const credentialArchiveResponse = await fetch(`${baseUrl}/api/admin/credential-documents-export`, {
  headers: bearer(adminToken),
});
assert.equal(credentialArchiveResponse.status, 200, "administrator credential document export should succeed");
assert.equal(credentialArchiveResponse.headers.get("content-type"), "application/zip");
assert.equal(credentialArchiveResponse.headers.get("cache-control"), "private, no-store");
const credentialArchive = unzipSync(new Uint8Array(await credentialArchiveResponse.arrayBuffer()));
assert.ok(credentialArchive["manifest.json"], "credential archive must include a manifest");
const credentialManifest = JSON.parse(strFromU8(credentialArchive["manifest.json"]));
assert.equal(credentialManifest.schemaVersion, 1);
assert.equal(credentialManifest.documentCount, Number(credentialArchiveResponse.headers.get("x-document-count")));

const auditExport = await request("/api/admin/audit-logs/export", { headers: bearer(adminToken) });
assert.equal(auditExport.response.status, 200, "administrator audit export should succeed");
assert.match(auditExport.response.headers.get("content-type") ?? "", /^text\/csv/);
const exportAudit = await request("/api/admin/audit-logs?limit=10", { headers: bearer(adminToken) });
assert.equal(exportAudit.response.status, 200);
const exportActions = exportAudit.body?.items?.map((item) => item.action) ?? [];
assert.ok(exportActions.includes("HOSPITAL_DATA_EXPORTED"), "hospital export must create an audit event");
assert.ok(exportActions.includes("AUDIT_LOG_EXPORTED"), "audit CSV export must create an audit event");
assert.ok(exportActions.includes("CREDENTIAL_DOCUMENTS_EXPORTED"), "credential document export must create an audit event");

const invalidCron = await request("/api/cron/push-delivery", {
  method: "POST",
  headers: { Authorization: "Bearer invalid-smoke-secret" },
});
assert.equal(invalidCron.response.status, 401, "cron endpoint must reject an invalid machine secret");

console.log("Production smoke checks passed (health, auth, tenant, RBAC, schedule, audit, cron). ");
