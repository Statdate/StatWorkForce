-- Database-level tenant integrity. Application authorization remains the
-- first line of defense; these triggers prevent invalid cross-hospital
-- relationships from being persisted by future code, imports, or scripts.

CREATE OR REPLACE FUNCTION enforce_unit_membership_tenant() RETURNS trigger AS $$
BEGIN
  IF (SELECT "hospitalId" FROM "User" WHERE id = NEW."userId") IS DISTINCT FROM
     (SELECT "hospitalId" FROM "Unit" WHERE id = NEW."unitId") THEN
    RAISE EXCEPTION 'cross-hospital unit membership is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "UnitMembership_tenant_guard"
BEFORE INSERT OR UPDATE OF "userId", "unitId" ON "UnitMembership"
FOR EACH ROW EXECUTE FUNCTION enforce_unit_membership_tenant();

CREATE OR REPLACE FUNCTION enforce_superuser_assignment_tenant() RETURNS trigger AS $$
DECLARE
  unit_hospital TEXT;
BEGIN
  SELECT "hospitalId" INTO unit_hospital FROM "Unit" WHERE id = NEW."unitId";
  IF (SELECT "hospitalId" FROM "User" WHERE id = NEW."userId") IS DISTINCT FROM unit_hospital
     OR (SELECT "hospitalId" FROM "User" WHERE id = NEW."grantedById") IS DISTINCT FROM unit_hospital THEN
    RAISE EXCEPTION 'cross-hospital superuser assignment is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SuperuserAssignment_tenant_guard"
BEFORE INSERT OR UPDATE OF "userId", "unitId", "grantedById" ON "SuperuserAssignment"
FOR EACH ROW EXECUTE FUNCTION enforce_superuser_assignment_tenant();

CREATE OR REPLACE FUNCTION enforce_schedule_assignment_tenant() RETURNS trigger AS $$
BEGIN
  IF (SELECT "hospitalId" FROM "User" WHERE id = NEW."userId") IS DISTINCT FROM
     (SELECT u."hospitalId" FROM "Shift" s JOIN "Unit" u ON u.id = s."unitId" WHERE s.id = NEW."shiftId") THEN
    RAISE EXCEPTION 'cross-hospital schedule assignment is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ScheduleAssignment_tenant_guard"
BEFORE INSERT OR UPDATE OF "userId", "shiftId" ON "ScheduleAssignment"
FOR EACH ROW EXECUTE FUNCTION enforce_schedule_assignment_tenant();

CREATE OR REPLACE FUNCTION enforce_schedule_request_tenant() RETURNS trigger AS $$
BEGIN
  IF (SELECT "hospitalId" FROM "User" WHERE id = NEW."userId") IS DISTINCT FROM
     (SELECT u."hospitalId" FROM "SchedulePeriod" p JOIN "Unit" u ON u.id = p."unitId" WHERE p.id = NEW."schedulePeriodId") THEN
    RAISE EXCEPTION 'cross-hospital schedule request is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ScheduleRequest_tenant_guard"
BEFORE INSERT OR UPDATE OF "userId", "schedulePeriodId" ON "ScheduleRequest"
FOR EACH ROW EXECUTE FUNCTION enforce_schedule_request_tenant();

CREATE OR REPLACE FUNCTION enforce_message_tenant() RETURNS trigger AS $$
BEGIN
  IF (SELECT "hospitalId" FROM "User" WHERE id = NEW."senderId") IS DISTINCT FROM
     (SELECT "hospitalId" FROM "User" WHERE id = NEW."recipientId") THEN
    RAISE EXCEPTION 'cross-hospital message is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_tenant_guard"
BEFORE INSERT OR UPDATE OF "senderId", "recipientId" ON "Message"
FOR EACH ROW EXECUTE FUNCTION enforce_message_tenant();

CREATE OR REPLACE FUNCTION enforce_time_entry_tenant() RETURNS trigger AS $$
BEGIN
  IF NEW."shiftId" IS NOT NULL AND
     (SELECT "hospitalId" FROM "User" WHERE id = NEW."userId") IS DISTINCT FROM
     (SELECT u."hospitalId" FROM "Shift" s JOIN "Unit" u ON u.id = s."unitId" WHERE s.id = NEW."shiftId") THEN
    RAISE EXCEPTION 'cross-hospital time entry is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TimeEntry_tenant_guard"
BEFORE INSERT OR UPDATE OF "userId", "shiftId" ON "TimeEntry"
FOR EACH ROW EXECUTE FUNCTION enforce_time_entry_tenant();

CREATE OR REPLACE FUNCTION enforce_call_in_tenant() RETURNS trigger AS $$
DECLARE
  shift_hospital TEXT;
BEGIN
  SELECT u."hospitalId" INTO shift_hospital
  FROM "Shift" s JOIN "Unit" u ON u.id = s."unitId" WHERE s.id = NEW."shiftId";
  IF (SELECT "hospitalId" FROM "User" WHERE id = NEW."reportedById") IS DISTINCT FROM shift_hospital
     OR (NEW."handledById" IS NOT NULL AND
         (SELECT "hospitalId" FROM "User" WHERE id = NEW."handledById") IS DISTINCT FROM shift_hospital) THEN
    RAISE EXCEPTION 'cross-hospital call-in is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CallIn_tenant_guard"
BEFORE INSERT OR UPDATE OF "shiftId", "reportedById", "handledById" ON "CallIn"
FOR EACH ROW EXECUTE FUNCTION enforce_call_in_tenant();
