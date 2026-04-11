/*
  Warnings:

  - Changed the type of `status` on the `QuotaHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "QuotaEventStatus" AS ENUM ('success', 'error', 'rate_limited');

-- AlterTable: safely migrate existing String values to enum type
-- Step 1: add new column with enum type as nullable
ALTER TABLE "QuotaHistory" ADD COLUMN "status_new" "QuotaEventStatus";

-- Step 2: migrate data from old column to new column (all existing values should be valid)
UPDATE "QuotaHistory" SET "status_new" = CAST("status" AS "QuotaEventStatus");

-- Step 3: drop old column and rename new one
ALTER TABLE "QuotaHistory" DROP COLUMN "status";
ALTER TABLE "QuotaHistory" RENAME COLUMN "status_new" TO "status";

-- Step 4: set the new column as NOT NULL
ALTER TABLE "QuotaHistory" ALTER COLUMN "status" SET NOT NULL;

