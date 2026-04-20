-- Remove report_json column (replaced by relational tables)
ALTER TABLE "pgr_reviews" DROP COLUMN IF EXISTS "report_json";

-- pgr_dept_results
CREATE TABLE "pgr_dept_results" (
  "id" TEXT NOT NULL,
  "pgr_review_id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "department_name" TEXT NOT NULL,
  "employee_count" INTEGER NOT NULL,
  "avg_score" DOUBLE PRECISION NOT NULL,
  "response_count" INTEGER NOT NULL,
  "total_recipients" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pgr_dept_results_pkey" PRIMARY KEY ("id")
);

-- pgr_question_results
CREATE TABLE "pgr_question_results" (
  "id" TEXT NOT NULL,
  "pgr_review_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "question_text" TEXT NOT NULL,
  "question_order" INTEGER NOT NULL,
  "avg_score" DOUBLE PRECISION NOT NULL,
  "response_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pgr_question_results_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "pgr_dept_results" ADD CONSTRAINT "pgr_dept_results_pgr_review_id_fkey"
  FOREIGN KEY ("pgr_review_id") REFERENCES "pgr_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pgr_dept_results" ADD CONSTRAINT "pgr_dept_results_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON UPDATE CASCADE;

ALTER TABLE "pgr_question_results" ADD CONSTRAINT "pgr_question_results_pgr_review_id_fkey"
  FOREIGN KEY ("pgr_review_id") REFERENCES "pgr_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "pgr_dept_results_pgr_review_id_idx" ON "pgr_dept_results"("pgr_review_id");
CREATE INDEX "pgr_question_results_pgr_review_id_idx" ON "pgr_question_results"("pgr_review_id");
