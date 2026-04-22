CREATE TABLE "department_work_days" (
  "department_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  PRIMARY KEY ("department_id", "day_of_week"),
  CONSTRAINT "department_work_days_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE
);

CREATE TABLE "employee_work_days" (
  "employee_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  PRIMARY KEY ("employee_id", "day_of_week"),
  CONSTRAINT "employee_work_days_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE
);

CREATE TABLE "survey_config_work_days" (
  "config_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  PRIMARY KEY ("config_id", "day_of_week"),
  CONSTRAINT "survey_config_work_days_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "survey_configurations"("id") ON DELETE CASCADE
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'work_days'
  ) THEN
    INSERT INTO "department_work_days" ("department_id", "day_of_week")
    SELECT id, unnest(string_to_array(work_days, ','))::integer
    FROM "departments"
    WHERE work_days IS NOT NULL AND work_days != '';
  END IF;
END$$;

INSERT INTO "survey_config_work_days" ("config_id", "day_of_week")
SELECT id, unnest(string_to_array(work_days, ','))::integer
FROM "survey_configurations"
WHERE work_days IS NOT NULL AND work_days != '';

ALTER TABLE "departments" DROP COLUMN IF EXISTS "work_days";
ALTER TABLE "employees" DROP COLUMN IF EXISTS "work_days";
ALTER TABLE "survey_configurations" DROP COLUMN IF EXISTS "work_days";
