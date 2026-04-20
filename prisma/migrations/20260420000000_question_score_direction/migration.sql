-- AddColumn score_direction to survey_questions
ALTER TABLE "survey_questions" ADD COLUMN "score_direction" VARCHAR(20) NOT NULL DEFAULT 'higher_is_better';
