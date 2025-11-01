-- CreateEnum
CREATE TYPE "MovementSource" AS ENUM ('MANUAL', 'SCAN_RECEPTION', 'SCAN_SALES', 'RECIPE_DEDUCTION', 'SYSTEM_ADJUSTMENT');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "saleId" TEXT,
ADD COLUMN     "source" "MovementSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "stock_movements_saleId_idx" ON "stock_movements"("saleId");

-- CreateIndex
CREATE INDEX "stock_movements_source_idx" ON "stock_movements"("source");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
