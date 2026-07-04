/** SELF_SCHEDULED now means "picked up, pending manager approval" (see
 * setShiftPickupApproval in src/lib/data/manager.ts) rather than a final
 * state, so the raw enum name is misleading shown as-is. */
export function assignmentStatusLabel(status: string) {
  switch (status) {
    case "SELF_SCHEDULED":
      return "Pending manager approval";
    case "APPROVED":
      return "Approved";
    case "MANAGER_ASSIGNED":
      return "Assigned";
    case "DROPPED":
      return "Dropped";
    default:
      return status.replaceAll("_", " ").toLowerCase();
  }
}
