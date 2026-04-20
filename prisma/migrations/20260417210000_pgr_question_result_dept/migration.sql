ALTER TABLE pgr_question_results
  ADD COLUMN IF NOT EXISTS department_id TEXT;

ALTER TABLE pgr_question_results
  ADD CONSTRAINT fk_pgr_question_results_dept
  FOREIGN KEY (department_id) REFERENCES departments(id);
