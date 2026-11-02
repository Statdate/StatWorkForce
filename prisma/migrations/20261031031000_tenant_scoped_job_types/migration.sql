-- Job types used to be global. Create one copy per hospital before adding the
-- tenant foreign key so future credential-policy edits cannot affect another
-- customer. The deterministic IDs make every reference update explicit.
ALTER TABLE "JobType" ADD COLUMN "hospitalId" TEXT;
DROP INDEX "JobType_name_key";

CREATE TEMP TABLE job_type_tenant_map AS
SELECT
  jt.id AS old_id,
  h.id AS hospital_id,
  'jt_' || md5(jt.id || ':' || h.id) AS new_id
FROM "JobType" jt
CROSS JOIN "Hospital" h;

INSERT INTO "JobType" (
  id, "hospitalId", name, category, "requiredCredentialTypes", "createdAt"
)
SELECT
  mapping.new_id,
  mapping.hospital_id,
  jt.name,
  jt.category,
  jt."requiredCredentialTypes",
  jt."createdAt"
FROM job_type_tenant_map mapping
JOIN "JobType" jt ON jt.id = mapping.old_id;

UPDATE "User" user_row
SET "jobTypeId" = mapping.new_id
FROM job_type_tenant_map mapping
WHERE user_row."jobTypeId" = mapping.old_id
  AND user_row."hospitalId" = mapping.hospital_id;

UPDATE "Shift" shift_row
SET "jobTypeId" = mapping.new_id
FROM job_type_tenant_map mapping
JOIN "Unit" unit_row ON unit_row."hospitalId" = mapping.hospital_id
WHERE shift_row."jobTypeId" = mapping.old_id
  AND shift_row."unitId" = unit_row.id;

DELETE FROM "JobType" WHERE "hospitalId" IS NULL;

ALTER TABLE "JobType" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "JobType"
ADD CONSTRAINT "JobType_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Hospital"(id) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "JobType_hospitalId_name_key" ON "JobType"("hospitalId", name);

CREATE OR REPLACE FUNCTION enforce_user_job_type_tenant() RETURNS trigger AS $$
BEGIN
  IF NEW."jobTypeId" IS NOT NULL AND
     NEW."hospitalId" IS DISTINCT FROM
     (SELECT "hospitalId" FROM "JobType" WHERE id = NEW."jobTypeId") THEN
    RAISE EXCEPTION 'cross-hospital user job type is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_job_type_tenant_guard"
BEFORE INSERT OR UPDATE OF "hospitalId", "jobTypeId" ON "User"
FOR EACH ROW EXECUTE FUNCTION enforce_user_job_type_tenant();

CREATE OR REPLACE FUNCTION enforce_shift_job_type_tenant() RETURNS trigger AS $$
BEGIN
  IF (SELECT "hospitalId" FROM "Unit" WHERE id = NEW."unitId") IS DISTINCT FROM
     (SELECT "hospitalId" FROM "JobType" WHERE id = NEW."jobTypeId") THEN
    RAISE EXCEPTION 'cross-hospital shift job type is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Shift_job_type_tenant_guard"
BEFORE INSERT OR UPDATE OF "unitId", "jobTypeId" ON "Shift"
FOR EACH ROW EXECUTE FUNCTION enforce_shift_job_type_tenant();
