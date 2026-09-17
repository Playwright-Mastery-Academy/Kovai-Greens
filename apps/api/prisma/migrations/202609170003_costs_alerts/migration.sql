-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lowStockGrams" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "batchId" TEXT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GrowingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
