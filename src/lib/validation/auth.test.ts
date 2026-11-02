import { describe, expect, it } from "vitest";
import { LoginFormSchema } from "./auth";

const valid = {
  organizationCode: "kaiser-la",
  badgeNumber: "10001",
  password: "not-a-real-production-password",
};

describe("LoginFormSchema", () => {
  it("normalizes organization codes", () => {
    const result = LoginFormSchema.parse({ ...valid, organizationCode: "  KAISER-LA  " });
    expect(result.organizationCode).toBe("kaiser-la");
  });

  it("requires a tenant before resolving a badge", () => {
    expect(LoginFormSchema.safeParse({ ...valid, organizationCode: "" }).success).toBe(false);
  });

  it("rejects codes outside the public identifier format", () => {
    expect(
      LoginFormSchema.safeParse({ ...valid, organizationCode: "hospital/../../other" }).success
    ).toBe(false);
  });
});
