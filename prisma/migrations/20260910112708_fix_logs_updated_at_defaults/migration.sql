-- AlterTable
ALTER TABLE "email_logs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "message_logs" ALTER COLUMN "updated_at" DROP DEFAULT;
