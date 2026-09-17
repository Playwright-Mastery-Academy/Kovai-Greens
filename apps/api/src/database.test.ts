import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL migration enforces traceability, money, mass balance and recurring uniqueness", async () => {
  const db = new PGlite();
  try {
    for (const migration of (await readdir("prisma/migrations"))
      .filter((x) => /^\d/.test(x))
      .sort())
      await db.exec(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    await db.exec(`INSERT INTO "Product" (id,name,variety,"growingDays","yieldGramsPerTray","seedGramsPerTray","pricePaisePerKg") VALUES ('p','Sunflower','Sunflower',7,300,30,180000);
 INSERT INTO "Supplier" (id,name,phone) VALUES ('s','Test supplier','9000000000');
 INSERT INTO "SeedLot" (id,"lotNumber","productId","supplierId","purchasedAt","expiresAt","purchasedGrams","remainingGrams","costPaise",location) VALUES ('sl','SL-1','p','s',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '1 year',1000,1000,10000,'Shelf A');
 INSERT INTO "GrowingBatch" (id,code,"productId","seedLotId","sownAt","germinationAt","harvestDueAt",trays,"seedGrams",medium,"expectedGrams") VALUES ('b','SUN-1','p','sl',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,10,300,'Coir',3000);
 INSERT INTO "Harvest" (id,"batchId","productId","harvestedAt","harvestedGrams","usableGrams","rejectedGrams",grade,"employeeId") VALUES ('h','b','p',CURRENT_TIMESTAMP,3000,2800,200,'A','u');
 INSERT INTO "InventoryLot" (id,"harvestId","onHandGrams") VALUES ('stock','h',2800);
 INSERT INTO "Customer" (id,name,type,phone,"billingAddress","deliveryAddress",area,pincode) VALUES ('c','Test school','SCHOOL','9000000000','School Road','School Road','Thudiyalur','641034');
 INSERT INTO "Schedule" (id,"customerId",kind,name,"productId","packGrams",quantity,"unitPricePaise",weekdays,"startAt") VALUES ('schedule','c','SCHOOL','Tuesday','p',25,100,2000,ARRAY[2],CURRENT_TIMESTAMP);
 INSERT INTO "Order" (id,number,"customerId","deliveryAt","subtotalPaise","totalPaise","scheduleId","occurrenceDate") VALUES ('order','ORDER-1','c',CURRENT_TIMESTAMP,200000,200000,'schedule','2026-09-22');`);
    await assert.rejects(
      db.exec(
        `UPDATE "InventoryLot" SET "reservedGrams"=2801 WHERE id='stock'`,
      ),
      /inventory_nonnegative/,
    );
    await assert.rejects(
      db.exec(`UPDATE "InventoryLot" SET "onHandGrams"=-1 WHERE id='stock'`),
      /inventory_nonnegative/,
    );
    await assert.rejects(
      db.exec(`UPDATE "SeedLot" SET "remainingGrams"=-1 WHERE id='sl'`),
      /seed_mass_balance/,
    );
    await assert.rejects(
      db.exec(`UPDATE "Harvest" SET "usableGrams"=3001 WHERE id='h'`),
      /harvest_mass_balance/,
    );
    await assert.rejects(
      db.exec(`UPDATE "Order" SET "totalPaise"=1 WHERE id='order'`),
      /order_money_balance/,
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO "Order" (id,number,"customerId","deliveryAt","subtotalPaise","totalPaise","scheduleId","occurrenceDate") VALUES ('order2','ORDER-2','c',CURRENT_TIMESTAMP,200000,200000,'schedule','2026-09-22')`,
      ),
      /unique constraint/,
    );
    await assert.rejects(
      db.exec(`DELETE FROM "SeedLot" WHERE id='sl'`),
      /foreign key constraint/,
    );
    const result = await db.query<{ name: string }>(
      `SELECT s.name FROM "InventoryLot" i JOIN "Harvest" h ON h.id=i."harvestId" JOIN "GrowingBatch" b ON b.id=h."batchId" JOIN "SeedLot" sl ON sl.id=b."seedLotId" JOIN "Supplier" s ON s.id=sl."supplierId" WHERE i.id='stock'`,
    );
    assert.equal(result.rows[0].name, "Test supplier");
  } finally {
    await db.close();
  }
});
