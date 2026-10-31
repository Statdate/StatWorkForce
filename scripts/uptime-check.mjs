import assert from "node:assert/strict";

const rawBaseUrl = process.env.MONITOR_BASE_URL;
assert.ok(rawBaseUrl, "MONITOR_BASE_URL is required");

const parsed = new URL(rawBaseUrl);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
assert.ok(parsed.protocol === "https:" || isLocal, "Remote monitoring requires an HTTPS URL");
const baseUrl = rawBaseUrl.replace(/\/$/, "");

async function check(path, expectedBody) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "StatWorkForce-Uptime/1.0" },
  });
  const durationMs = Math.round(performance.now() - started);
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  assert.equal(response.headers.get("cache-control"), "no-store", `${path} must not be cached`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path} security headers missing`);
  assert.deepEqual(await response.json(), expectedBody, `${path} returned an unexpected body`);
  console.log(`${path} passed in ${durationMs}ms`);
}

await check("/api/health/live", { status: "alive" });
await check("/api/health", { status: "ok" });
console.log("External liveness and readiness checks passed.");
