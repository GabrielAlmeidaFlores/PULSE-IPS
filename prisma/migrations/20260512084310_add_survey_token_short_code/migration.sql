/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,short_code]` on the table `health_survey_response_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "health_survey_response_tokens" ADD COLUMN     "short_code" VARCHAR(7);

-- CreateIndex
CREATE UNIQUE INDEX "health_survey_response_tokens_tenant_id_short_code_key" ON "health_survey_response_tokens"("tenant_id", "short_code");
