-- Add report_json column to pgr_reviews to store generated report data
ALTER TABLE "pgr_reviews" ADD COLUMN "report_json" JSONB;
