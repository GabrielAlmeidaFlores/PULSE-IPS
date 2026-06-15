-- AlterTable: remove unique constraint on (tenant_id, email) in employees
DROP INDEX "employees_tenant_id_email_key";
