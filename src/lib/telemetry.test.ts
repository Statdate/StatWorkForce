import { describe, expect, it } from "vitest";
import { buildServerErrorEvent } from "./telemetry";

describe("server error telemetry", () => {
  it("records operational dimensions without error or request contents", () => {
    const error = Object.assign(new Error("password=secret patient-name"), {
      digest: "safe-digest-123",
      stack: "sensitive stack",
    });
    const event = buildServerErrorEvent(
      error,
      { method: "POST" },
      { routePath: "/api/messages/send", routeType: "route", routerKind: "App-Router" },
      "staging",
      "abc123"
    );
    const serialized = JSON.stringify(event);
    expect(event).toMatchObject({
      event: "server_request_error",
      environment: "staging",
      release: "abc123",
      errorName: "Error",
      digest: "safe-digest-123",
      method: "POST",
      routePath: "/api/messages/send",
    });
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("patient-name");
    expect(serialized).not.toContain("sensitive stack");
  });

  it("replaces unsafe attacker-controlled dimensions", () => {
    const event = buildServerErrorEvent(
      { digest: "line\nbreak" },
      { method: "GET injected" },
      { routePath: "/safe?token=secret", routeType: "route", routerKind: "App Router" }
    );
    expect(event).toMatchObject({
      digest: "unavailable",
      method: "UNKNOWN",
      routePath: "unknown",
      routerKind: "unknown",
    });
  });
});
