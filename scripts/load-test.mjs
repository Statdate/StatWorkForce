import assert from "node:assert/strict";

const baseUrl = (process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const organizationCode = process.env.LOAD_ORG_CODE ?? "kaiser-la";
const badgeNumber = process.env.LOAD_WORKER_BADGE ?? "30001";
const password = process.env.LOAD_WORKER_PASSWORD ?? "Password123!";
const concurrency = Number.parseInt(process.env.LOAD_CONCURRENCY ?? "10", 10);
const requestsPerUser = Number.parseInt(process.env.LOAD_REQUESTS_PER_USER ?? "20", 10);
const maxErrorRate = Number.parseFloat(process.env.LOAD_MAX_ERROR_RATE ?? "0.005");
const maxP95Ms = Number.parseInt(process.env.LOAD_MAX_P95_MS ?? "750", 10);

assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 200, "LOAD_CONCURRENCY must be 1-200");
assert.ok(Number.isInteger(requestsPerUser) && requestsPerUser >= 1 && requestsPerUser <= 1_000, "LOAD_REQUESTS_PER_USER must be 1-1000");
assert.ok(maxErrorRate >= 0 && maxErrorRate <= 1, "LOAD_MAX_ERROR_RATE must be 0-1");
assert.ok(maxP95Ms > 0, "LOAD_MAX_P95_MS must be positive");

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationCode, badgeNumber, password }),
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200, `load-test login returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(typeof body.token, "string", "load-test login did not return a token");
  return body.token;
}

const token = await login();
const paths = ["/api/schedule", "/api/schedule/open", "/api/notifications", "/api/me"];
const durations = [];
let failures = 0;

async function virtualUser(userIndex) {
  for (let requestIndex = 0; requestIndex < requestsPerUser; requestIndex += 1) {
    const path = paths[(userIndex + requestIndex) % paths.length];
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "StatWorkForce-Load/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    } finally {
      durations.push(performance.now() - started);
    }
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, (_, index) => virtualUser(index)));
const elapsedMs = performance.now() - started;
durations.sort((a, b) => a - b);
const percentile = (value) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)];
const errorRate = failures / durations.length;
const requestsPerSecond = durations.length / (elapsedMs / 1000);

console.log(`Requests: ${durations.length}; concurrency: ${concurrency}; throughput: ${requestsPerSecond.toFixed(1)} req/s`);
console.log(`Latency p50/p95/p99: ${percentile(0.5).toFixed(0)}/${percentile(0.95).toFixed(0)}/${percentile(0.99).toFixed(0)}ms`);
console.log(`Failures: ${failures}; error rate: ${(errorRate * 100).toFixed(2)}%`);

assert.ok(errorRate <= maxErrorRate, `error rate ${errorRate} exceeded ${maxErrorRate}`);
assert.ok(percentile(0.95) <= maxP95Ms, `p95 ${percentile(0.95).toFixed(0)}ms exceeded ${maxP95Ms}ms`);
console.log("Load-test thresholds passed.");
