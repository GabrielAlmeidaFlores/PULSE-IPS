-- AlterTable: add reminder_sent_at to health_survey_response_tokens
ALTER TABLE "health_survey_response_tokens" ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMPTZ;

-- Drop stale table if exists (may have been created with wrong column type in a prior failed attempt)
DROP TABLE IF EXISTS "health_survey_response_token_work_days";

-- CreateTable: health_survey_response_token_work_days
CREATE TABLE "health_survey_response_token_work_days" (
    "token_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,

    CONSTRAINT "health_survey_response_token_work_days_pkey" PRIMARY KEY ("token_id","day_of_week")
);

-- AddForeignKey
ALTER TABLE "health_survey_response_token_work_days"
  ADD CONSTRAINT "health_survey_response_token_work_days_token_id_fkey"
  FOREIGN KEY ("token_id") REFERENCES "health_survey_response_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
