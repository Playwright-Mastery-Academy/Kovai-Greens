-- CreateTable
CREATE TABLE "ScheduleItem" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packGrams" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleItem_scheduleId_idx" ON "ScheduleItem"("scheduleId");

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ScheduleItem" (id,"scheduleId","productId","packGrams",quantity,"unitPricePaise")
SELECT id || '-initial',id,"productId","packGrams",quantity,"unitPricePaise" FROM "Schedule";
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "schedule_item_positive" CHECK ("packGrams">0 AND quantity>0 AND "unitPricePaise">=0);
