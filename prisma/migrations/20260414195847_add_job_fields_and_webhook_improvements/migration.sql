-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "pause_end_at" TIMESTAMP(3),
ADD COLUMN     "pause_start_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pgr_reviews" ADD COLUMN     "next_review_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stripe_webhook_events" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "payload" JSONB,
ALTER COLUMN "processed_at" DROP NOT NULL,
ALTER COLUMN "processed_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "survey_dispatches" ADD COLUMN     "adherence_checked_at" TIMESTAMP(3);
