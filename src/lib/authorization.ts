export type UnitAuthorizationSubject = {
  accountType: "ADMIN" | "MANAGER" | "WORKER";
  hospitalId: string;
  unitIds: readonly string[];
};

/** Pure tenant + role authorization rule used after a unit has been loaded.
 * Admin scope stops at the hospital boundary; manager scope stops at their
 * explicit memberships; workers can never perform manager operations. */
export function canManageUnit(
  subject: UnitAuthorizationSubject,
  unit: { id: string; hospitalId: string }
) {
  if (unit.hospitalId !== subject.hospitalId) return false;
  if (subject.accountType === "ADMIN") return true;
  if (subject.accountType !== "MANAGER") return false;
  return subject.unitIds.includes(unit.id);
}
