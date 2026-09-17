-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "growingDays" INTEGER NOT NULL,
    "yieldGramsPerTray" INTEGER NOT NULL,
    "seedGramsPerTray" INTEGER NOT NULL,
    "pricePaisePerKg" INTEGER NOT NULL,
    "storageInstructions" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFormat" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,

    CONSTRAINT "ProductFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "suppliedProducts" TEXT NOT NULL DEFAULT '',
    "gst" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "purchasedGrams" INTEGER NOT NULL,
    "remainingGrams" INTEGER NOT NULL,
    "costPaise" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowingBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "seedLotId" TEXT NOT NULL,
    "sownAt" TIMESTAMP(3) NOT NULL,
    "germinationAt" TIMESTAMP(3) NOT NULL,
    "harvestDueAt" TIMESTAMP(3) NOT NULL,
    "trays" INTEGER NOT NULL,
    "seedGrams" INTEGER NOT NULL,
    "medium" TEXT NOT NULL,
    "expectedGrams" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "harvestedAt" TIMESTAMP(3) NOT NULL,
    "harvestedGrams" INTEGER NOT NULL,
    "usableGrams" INTEGER NOT NULL,
    "rejectedGrams" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Harvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "harvestId" TEXT NOT NULL,
    "onHandGrams" INTEGER NOT NULL,
    "reservedGrams" INTEGER NOT NULL DEFAULT 0,
    "packedGrams" INTEGER NOT NULL DEFAULT 0,
    "bestBefore" TIMESTAMP(3),

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "onHandDelta" INTEGER NOT NULL,
    "reservedDelta" INTEGER NOT NULL,
    "packedDelta" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contact" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "billingAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Coimbatore',
    "pincode" TEXT NOT NULL,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deliveryAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotalPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "scheduleId" TEXT,
    "occurrenceDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packGrams" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingBatch" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "packs" INTEGER NOT NULL,
    "packGrams" INTEGER NOT NULL,
    "packedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packedBy" TEXT NOT NULL,
    "bestBefore" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PACKED',

    CONSTRAINT "PackingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packGrams" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "weekdays" INTEGER[],
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "participatingStudents" INTEGER,
    "grades" TEXT NOT NULL DEFAULT '',
    "billingCycle" TEXT NOT NULL DEFAULT 'PER_ORDER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "deliveryAt" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL DEFAULT '',
    "route" TEXT NOT NULL DEFAULT '',
    "driverId" TEXT,
    "vehicle" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PAYMENT',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFormat_productId_grams_key" ON "ProductFormat"("productId", "grams");

-- CreateIndex
CREATE UNIQUE INDEX "SeedLot_lotNumber_key" ON "SeedLot"("lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GrowingBatch_code_key" ON "GrowingBatch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_harvestId_key" ON "InventoryLot"("harvestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_deliveryAt_status_idx" ON "Order"("deliveryAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_scheduleId_occurrenceDate_key" ON "Order"("scheduleId", "occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_itemId_lotId_key" ON "Allocation"("itemId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingBatch_allocationId_key" ON "PackingBatch"("allocationId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingBatch_publicToken_key" ON "PackingBatch"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_requestKey_key" ON "Payment"("requestKey");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFormat" ADD CONSTRAINT "ProductFormat_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedLot" ADD CONSTRAINT "SeedLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedLot" ADD CONSTRAINT "SeedLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowingBatch" ADD CONSTRAINT "GrowingBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowingBatch" ADD CONSTRAINT "GrowingBatch_seedLotId_fkey" FOREIGN KEY ("seedLotId") REFERENCES "SeedLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GrowingBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "Harvest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingBatch" ADD CONSTRAINT "PackingBatch_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Inventory invariants also hold for direct database writes.
ALTER TABLE "InventoryLot" ADD CONSTRAINT "inventory_nonnegative" CHECK ("onHandGrams" >= 0 AND "reservedGrams" >= 0 AND "packedGrams" >= 0 AND "reservedGrams" + "packedGrams" <= "onHandGrams");
ALTER TABLE "SeedLot" ADD CONSTRAINT "seed_mass_balance" CHECK ("remainingGrams" >= 0 AND "remainingGrams" <= "purchasedGrams" AND "purchasedGrams" > 0);
ALTER TABLE "Harvest" ADD CONSTRAINT "harvest_mass_balance" CHECK ("harvestedGrams" > 0 AND "usableGrams" >= 0 AND "rejectedGrams" >= 0 AND "usableGrams" + "rejectedGrams" = "harvestedGrams");
ALTER TABLE "Order" ADD CONSTRAINT "order_money_balance" CHECK ("subtotalPaise" >= 0 AND "discountPaise" >= 0 AND "discountPaise" <= "subtotalPaise" AND "taxPaise" >= 0 AND "totalPaise" = "subtotalPaise" - "discountPaise" + "taxPaise");
ALTER TABLE "OrderItem" ADD CONSTRAINT "order_item_positive" CHECK ("quantity" > 0 AND "packGrams" > 0 AND "unitPricePaise" >= 0);
ALTER TABLE "Allocation" ADD CONSTRAINT "allocation_positive" CHECK ("grams" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_positive" CHECK ("amountPaise" > 0 AND "kind" IN ('PAYMENT','REFUND'));
ALTER TABLE "GrowingBatch" ADD CONSTRAINT "batch_status" CHECK ("status" IN ('PLANNED','SOWN','GERMINATING','GROWING','READY_TO_HARVEST','HARVESTED','FAILED','CANCELLED'));
ALTER TABLE "Order" ADD CONSTRAINT "order_status" CHECK ("status" IN ('DRAFT','CONFIRMED','ALLOCATED','PACKING','PACKED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'));
ALTER TABLE "User" ADD CONSTRAINT "user_role" CHECK ("role" IN ('OWNER','ADMIN','PRODUCTION_MANAGER','FARM_WORKER','SALES','DELIVERY'));
