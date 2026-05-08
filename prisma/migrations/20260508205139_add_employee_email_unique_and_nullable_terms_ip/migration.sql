/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,email]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "platform_terms_acceptances" ALTER COLUMN "ip_address" DROP NOT NULL,
ALTER COLUMN "user_agent" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_email_key" ON "employees"("tenant_id", "email");
