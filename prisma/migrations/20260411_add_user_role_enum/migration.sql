/*
  Warnings:

  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- AlterTable: safely migrate existing String values to enum type
-- Step 1: add new column with enum type as nullable
ALTER TABLE "User" ADD COLUMN "role_new" "Role";

-- Step 2: migrate valid values and fallback unknown values to 'user'
UPDATE "User"
SET "role_new" = CASE
  WHEN "role" = 'admin' THEN 'admin'::"Role"
  ELSE 'user'::"Role"
END;

-- Step 3: drop old column and rename new one
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";

-- Step 4: set default and not null
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
