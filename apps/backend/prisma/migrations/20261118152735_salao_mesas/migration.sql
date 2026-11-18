-- AlterTable
ALTER TABLE "closed_account" ADD COLUMN     "openedBy" TEXT;

-- AlterTable
ALTER TABLE "table" ADD COLUMN     "openedBy" TEXT;

-- CreateTable
CREATE TABLE "restaurant_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totalTables" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_config_pkey" PRIMARY KEY ("id")
);
