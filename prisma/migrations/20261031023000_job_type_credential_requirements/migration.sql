ALTER TABLE "JobType"
ADD COLUMN "requiredCredentialTypes" "CredentialType"[] NOT NULL DEFAULT ARRAY[]::"CredentialType"[];

UPDATE "JobType"
SET "requiredCredentialTypes" = ARRAY['RN_LICENSE']::"CredentialType"[]
WHERE name = 'RN';

UPDATE "JobType"
SET "requiredCredentialTypes" = ARRAY['LPN_LICENSE']::"CredentialType"[]
WHERE name = 'LPN';
