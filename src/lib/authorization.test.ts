import { describe, expect, it } from "vitest";
import { canManageUnit } from "./authorization";

const unit = { id: "unit-a", hospitalId: "hospital-a" };

describe("canManageUnit", () => {
  it("allows an admin inside their hospital", () => {
    expect(
      canManageUnit({ accountType: "ADMIN", hospitalId: "hospital-a", unitIds: [] }, unit)
    ).toBe(true);
  });

  it("never treats an admin as globally unscoped", () => {
    expect(
      canManageUnit(
        { accountType: "ADMIN", hospitalId: "hospital-b", unitIds: [] },
        unit
      )
    ).toBe(false);
  });

  it("allows only a manager's explicitly assigned units", () => {
    expect(
      canManageUnit(
        { accountType: "MANAGER", hospitalId: "hospital-a", unitIds: ["unit-a"] },
        unit
      )
    ).toBe(true);
    expect(
      canManageUnit(
        { accountType: "MANAGER", hospitalId: "hospital-a", unitIds: ["unit-b"] },
        unit
      )
    ).toBe(false);
  });

  it("does not grant manager operations to workers", () => {
    expect(
      canManageUnit(
        { accountType: "WORKER", hospitalId: "hospital-a", unitIds: ["unit-a"] },
        unit
      )
    ).toBe(false);
  });
});
