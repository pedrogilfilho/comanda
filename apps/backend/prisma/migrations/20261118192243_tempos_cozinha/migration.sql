-- AlterTable
ALTER TABLE "order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);
