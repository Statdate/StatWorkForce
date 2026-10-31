export type HealthShift = {
  id: string;
  startTime: Date;
  endTime: Date;
  requiredCount: number;
  unit: { name: string };
  jobType: { name: string; requiredCredentialTypes: string[] };
  assignments: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      credentials: Array<{ type: string; expirationDate: Date }>;
    };
  }>;
};

export function analyzeOperationalHealth(shifts: HealthShift[]) {
  const staffingGaps = shifts
    .filter((shift) => shift.assignments.length < shift.requiredCount)
    .map((shift) => ({
      shiftId: shift.id,
      unitName: shift.unit.name,
      jobTypeName: shift.jobType.name,
      startTime: shift.startTime,
      requiredCount: shift.requiredCount,
      assignedCount: shift.assignments.length,
    }));

  const credentialRisks = shifts.flatMap((shift) =>
    shift.assignments.flatMap(({ user }) => {
      const missing = shift.jobType.requiredCredentialTypes.filter(
        (required) =>
          !user.credentials.some(
            (credential) => credential.type === required && credential.expirationDate >= shift.endTime
          )
      );
      return missing.length === 0
        ? []
        : [{
            shiftId: shift.id,
            userId: user.id,
            workerName: `${user.firstName} ${user.lastName}`,
            unitName: shift.unit.name,
            startTime: shift.startTime,
            missingCredentialTypes: missing,
          }];
    })
  );

  const byUser = new Map<string, Array<{ shift: HealthShift; workerName: string }>>();
  for (const shift of shifts) {
    for (const { user } of shift.assignments) {
      const entries = byUser.get(user.id) ?? [];
      entries.push({ shift, workerName: `${user.firstName} ${user.lastName}` });
      byUser.set(user.id, entries);
    }
  }
  const overlaps = [];
  for (const [userId, entries] of byUser) {
    entries.sort((left, right) => left.shift.startTime.getTime() - right.shift.startTime.getTime());
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        if (right.shift.startTime >= left.shift.endTime) break;
        overlaps.push({
          userId,
          workerName: left.workerName,
          firstShiftId: left.shift.id,
          secondShiftId: right.shift.id,
          firstUnitName: left.shift.unit.name,
          secondUnitName: right.shift.unit.name,
          overlapStartsAt: right.shift.startTime,
        });
      }
    }
  }

  return { staffingGaps, credentialRisks, overlaps };
}
