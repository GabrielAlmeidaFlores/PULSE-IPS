-- Rename cpf_hash → document_hash in employee_consents
ALTER TABLE "employee_consents" RENAME COLUMN "cpf_hash" TO "document_hash";

-- Update source value: sms_link → message_link
UPDATE "employee_consents" SET "source" = 'message_link' WHERE "source" = 'sms_link';

-- Add document field to employees
ALTER TABLE "employees" ADD COLUMN "document" VARCHAR(50);

-- Add signed_link_token to health_survey_dispatches
ALTER TABLE "health_survey_dispatches" ADD COLUMN "signed_link_token" VARCHAR(255);
CREATE UNIQUE INDEX "health_survey_dispatches_signed_link_token_key" ON "health_survey_dispatches"("signed_link_token");
