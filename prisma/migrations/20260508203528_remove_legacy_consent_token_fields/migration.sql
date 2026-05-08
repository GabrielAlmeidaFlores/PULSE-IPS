/*
  Warnings:

  - You are about to drop the column `token` on the `employee_consents` table. All the data in the column will be lost.
  - You are about to drop the column `token_expires_at` on the `employee_consents` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "employee_consents_token_key";

-- AlterTable
ALTER TABLE "employee_consents" DROP COLUMN "token",
DROP COLUMN "token_expires_at";
