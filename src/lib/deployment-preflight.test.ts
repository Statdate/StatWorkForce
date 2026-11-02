import { describe, expect, it } from "vitest";
import { validateDeploymentEnv } from "../../scripts/deployment-preflight.mjs";

const valid = {
  DEPLOYMENT_TIER: "production",
  DATABASE_URL: "postgresql://app:secret@db.example.com/statworkforce?sslmode=require",
  SESSION_SECRET: "s".repeat(40),
  CRON_SECRET: "c".repeat(40),
  CREDENTIAL_STORAGE_BUCKET: "hospital-credentials",
  AWS_REGION: "us-west-2",
};

describe("deployment preflight", () => {
  it("accepts a complete production configuration", () => {
    expect(validateDeploymentEnv(valid)).toEqual({ errors: [], warnings: [] });
  });

  it("rejects local databases, weak/reused secrets, and missing production storage", () => {
    const result = validateDeploymentEnv({
      ...valid,
      DATABASE_URL: "postgresql://app@localhost/statworkforce",
      SESSION_SECRET: "short",
      CRON_SECRET: "short",
      CREDENTIAL_STORAGE_BUCKET: "",
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("localhost"),
      expect.stringContaining("SESSION_SECRET must be at least"),
      expect.stringContaining("CRON_SECRET must be at least"),
      expect.stringContaining("must be different"),
      expect.stringContaining("CREDENTIAL_STORAGE_BUCKET is required"),
    ]));
  });

  it("allows staging without object storage but reports the limitation", () => {
    const result = validateDeploymentEnv({
      ...valid,
      DEPLOYMENT_TIER: "staging",
      CREDENTIAL_STORAGE_BUCKET: "",
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
