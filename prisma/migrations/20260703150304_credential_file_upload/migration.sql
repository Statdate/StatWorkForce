-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "fileUrl",
ADD COLUMN     "fileData" BYTEA,
ADD COLUMN     "fileMimeType" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUploadedAt" TIMESTAMP(3);

