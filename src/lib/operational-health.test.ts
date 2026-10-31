import { describe, expect, it } from "vitest";
import { analyzeOperationalHealth, type HealthShift } from "./operational-health";

function shift(overrides: Partial<HealthShift> = {}): HealthShift {
  return {
    id: "shift-1",
    startTime: new Date("2026-11-01T08:00:00Z"),
    endTime: new Date("2026-11-01T16:00:00Z"),
    requiredCount: 2,
    unit: { name: "ICU" },
    jobType: { name: "RN", requiredCredentialTypes: ["BLS"] },
    assignments: [{
      user: {
        id: "worker-1",
        firstName: "Jamie",
        lastName: "Nurse",
        credentials: [{ type: "BLS", expirationDate: new Date("2026-10-31T00:00:00Z") }],
      },
    }],
    ...overrides,
  };
}

describe("operational health analysis", () => {
  it("reports staffing and credential gaps", () => {
    const result = analyzeOperationalHealth([shift()]);
    expect(result.staffingGaps).toHaveLength(1);
    expect(result.credentialRisks[0]?.missingCredentialTypes).toEqual(["BLS"]);
  });

  it("reports overlapping assignments for the same worker", () => {
    const first = shift({ requiredCount: 1 });
    const second = shift({
      id: "shift-2",
      requiredCount: 1,
      startTime: new Date("2026-11-01T15:00:00Z"),
      endTime: new Date("2026-11-01T23:00:00Z"),
    });
    expect(analyzeOperationalHealth([first, second]).overlaps).toHaveLength(1);
  });

  it("does not flag valid credentials or adjacent shifts", () => {
    const validUser = {
      id: "worker-1",
      firstName: "Jamie",
      lastName: "Nurse",
      credentials: [{ type: "BLS", expirationDate: new Date("2027-01-01T00:00:00Z") }],
    };
    const first = shift({ requiredCount: 1, assignments: [{ user: validUser }] });
    const second = shift({
      id: "shift-2",
      requiredCount: 1,
      startTime: first.endTime,
      endTime: new Date("2026-11-02T00:00:00Z"),
      assignments: [{ user: validUser }],
    });
    expect(analyzeOperationalHealth([first, second])).toEqual({
      staffingGaps: [], credentialRisks: [], overlaps: [],
    });
  });
});
