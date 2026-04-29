ALTER TABLE "survey_config_work_days" RENAME TO "health_survey_config_work_days";
ALTER TABLE "survey_configurations" RENAME TO "health_survey_configurations";
ALTER TABLE "survey_questions" RENAME TO "health_survey_questions";
ALTER TABLE "survey_dispatches" RENAME TO "health_survey_dispatches";
ALTER TABLE "survey_response_tokens" RENAME TO "health_survey_response_tokens";
ALTER TABLE "survey_responses" RENAME TO "health_survey_responses";
ALTER TABLE "survey_response_items" RENAME TO "health_survey_response_items";

ALTER TABLE "health_survey_questions" RENAME COLUMN "survey_configuration_id" TO "health_survey_configuration_id";
ALTER TABLE "health_survey_dispatches" RENAME COLUMN "survey_configuration_id" TO "health_survey_configuration_id";
ALTER TABLE "health_survey_response_items" RENAME COLUMN "survey_response_id" TO "health_survey_response_id";
