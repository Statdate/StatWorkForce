-- Add a stable, user-facing tenant identifier so badge numbers only resolve
-- inside the hospital the user explicitly selected.
ALTER TABLE "Hospital" ADD COLUMN "code" TEXT;

UPDATE "Hospital"
SET "code" = CASE
  WHEN "name" = 'Kaiser Los Angeles Medical Center' THEN 'kaiser-la'
  ELSE trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')))
       || '-' || left("id", 6)
END;

ALTER TABLE "Hospital" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");
