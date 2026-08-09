-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "enEquipo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "initials" TEXT,
ADD COLUMN     "teamOrder" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "title" TEXT;
