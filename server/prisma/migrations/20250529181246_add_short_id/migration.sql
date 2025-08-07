/*
  Warnings:

  - A unique constraint covering the columns `[short_id]` on the table `surveys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `short_id` to the `surveys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "short_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "surveys_short_id_key" ON "surveys"("short_id");
