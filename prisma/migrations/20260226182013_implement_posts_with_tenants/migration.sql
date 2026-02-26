/*
  Warnings:

  - A unique constraint covering the columns `[id,tenantId]` on the table `posts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "posts_tenantId_idx" ON "posts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "posts_id_tenantId_key" ON "posts"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
