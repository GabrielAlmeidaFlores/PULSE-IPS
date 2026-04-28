ALTER TABLE "survey_responses" DROP CONSTRAINT IF EXISTS "survey_responses_token_id_key";
ALTER TABLE "survey_responses" DROP COLUMN IF EXISTS "token_id";
