import assert from "node:assert/strict";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

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

async function login(badgeNumber) {
  const result = await request("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationCode: "kaiser-la",
      badgeNumber,
      password: "Password123!",
    }),
  });
  assert.equal(result.response.status, 200, `seeded login ${badgeNumber} should succeed`);
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

const unauthenticated = await request("/api/me");
assert.equal(unauthenticated.response.status, 401, "protected API should reject anonymous access");

const wrongHospital = await request("/api/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    organizationCode: "wrong-hospital",
    badgeNumber: "30001",
    password: "Password123!",
  }),
});
assert.equal(wrongHospital.response.status, 401, "tenant-qualified login must reject a wrong hospital");

const workerToken = await login("30001");
const workerProfile = await request("/api/me", { headers: bearer(workerToken) });
assert.equal(workerProfile.response.status, 200);
assert.equal(workerProfile.body?.accountType, "WORKER");
assert.equal(workerProfile.body?.badgeNumber, "30001");

const workerSchedule = await request("/api/schedule", { headers: bearer(workerToken) });
assert.equal(workerSchedule.response.status, 200, "worker schedule should load");
assert.ok(Array.isArray(workerSchedule.body?.assignments));

const workerAuditAttempt = await request("/api/admin/audit-logs?limit=1", {
  headers: bearer(workerToken),
});
assert.equal(workerAuditAttempt.response.status, 403, "worker must not access admin audit data");

const workerManagerAttempt = await request("/api/manager/schedule", {
  headers: bearer(workerToken),
});
assert.equal(workerManagerAttempt.response.status, 403, "worker must not access manager scheduling data");

const adminToken = await login("10001");
const adminAudit = await request("/api/admin/audit-logs?limit=1", {
  headers: bearer(adminToken),
});
assert.equal(adminAudit.response.status, 200, "admin audit endpoint should load");
assert.ok(Array.isArray(adminAudit.body?.items));

const invalidCron = await request("/api/cron/push-delivery", {
  method: "POST",
  headers: { Authorization: "Bearer invalid-smoke-secret" },
});
assert.equal(invalidCron.response.status, 401, "cron endpoint must reject an invalid machine secret");

console.log("Production smoke checks passed (health, auth, tenant, RBAC, schedule, audit, cron). ");
