-- AlterTable
ALTER TABLE "treatments" ADD COLUMN "horarios" TEXT[] DEFAULT ARRAY[]::TEXT[];
