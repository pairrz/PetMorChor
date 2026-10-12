/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `ListingMedia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `PostMedia` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ListingMedia" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "PostMedia" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ListingMedia_publicId_key" ON "ListingMedia"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "PostMedia_publicId_key" ON "PostMedia"("publicId");
