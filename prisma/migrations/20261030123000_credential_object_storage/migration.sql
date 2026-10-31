ALTER TABLE "Credential"
ADD COLUMN "storageProvider" TEXT,
ADD COLUMN "storageKey" TEXT;

CREATE INDEX "Credential_storageKey_idx" ON "Credential"("storageKey");
