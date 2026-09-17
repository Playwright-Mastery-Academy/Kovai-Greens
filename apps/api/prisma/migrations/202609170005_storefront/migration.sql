CREATE TABLE "StoreCheckout" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentReference" TEXT NOT NULL DEFAULT '',
  "razorpayLink" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreCheckout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreCheckout_requestId_key" ON "StoreCheckout"("requestId");
CREATE UNIQUE INDEX "StoreCheckout_token_key" ON "StoreCheckout"("token");
CREATE UNIQUE INDEX "StoreCheckout_orderId_key" ON "StoreCheckout"("orderId");
ALTER TABLE "StoreCheckout" ADD CONSTRAINT "StoreCheckout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
