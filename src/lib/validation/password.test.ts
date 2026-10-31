import { describe, expect, it } from "vitest";
import { CreateHospitalUserSchema, InitialPasswordChangeSchema, StrongPasswordSchema, UpdateHospitalUserAccessSchema } from "./password";

describe("password and provisioning validation", () => {
  it("requires a strong password", () => {
    expect(StrongPasswordSchema.safeParse("short").success).toBe(false);
    expect(StrongPasswordSchema.safeParse("LongEnough123!").success).toBe(true);
  });

  it("requires matching replacement passwords", () => {
    expect(InitialPasswordChangeSchema.safeParse({
      currentPassword: "Temporary123!",
      newPassword: "Replacement123!",
      confirmPassword: "Different123!",
    }).success).toBe(false);
  });

  it("requires at least one unit for a provisioned worker or manager", () => {
    expect(CreateHospitalUserSchema.safeParse({
      firstName: "Avery",
      lastName: "Nurse",
      badgeNumber: "40001",
      email: "",
      accountType: "WORKER",
      jobTypeId: "job-rn",
      temporaryPassword: "Temporary123!",
      unitIds: [],
    }).success).toBe(false);
  });

  it("does not allow hospital-admin privilege through the staff access form", () => {
    expect(UpdateHospitalUserAccessSchema.safeParse({ accountType: "ADMIN", jobTypeId: "", unitIds: ["unit-1"] }).success).toBe(false);
  });

  it("requires a clinical job type for workers", () => {
    expect(UpdateHospitalUserAccessSchema.safeParse({ accountType: "WORKER", jobTypeId: "", unitIds: ["unit-1"] }).success).toBe(false);
  });
});
