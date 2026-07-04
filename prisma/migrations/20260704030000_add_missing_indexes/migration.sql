-- Query-pattern-driven indexes: each of these covers a where-clause that
-- isn't served by an existing unique/composite index (Postgres won't use a
-- composite index for a filter on anything but its leftmost column(s)).

-- getUnitStaff() / getMessageThreadsForUser() / getUnitMessageThreads()
-- filter UnitMembership by unitId alone; the existing unique index is on
-- (userId, unitId), so unitId-only lookups don't benefit from it.
CREATE INDEX "UnitMembership_unitId_idx" ON "UnitMembership"("unitId");

-- getScheduleForUser() filters ScheduleAssignment by userId alone; the
-- existing unique index is on (shiftId, userId).
CREATE INDEX "ScheduleAssignment_userId_idx" ON "ScheduleAssignment"("userId");

-- getCredentialsForUser() filters by userId and orders by expirationDate —
-- covers both in one index instead of a table scan + sort.
CREATE INDEX "Credential_userId_expirationDate_idx" ON "Credential"("userId", "expirationDate");
