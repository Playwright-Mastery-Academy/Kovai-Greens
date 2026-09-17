import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { occurrences } from "./domain";

const marker = "sampleDatasetVersion";
const day = (offset: number, hour = 9) => {
  const now = new Date(Date.now() + 19800000);
  now.setUTCDate(now.getUTCDate() + offset);
  return new Date(
    now.toISOString().slice(0, 10) +
      `T${String(hour).padStart(2, "0")}:00:00+05:30`,
  );
};

/** Explicit, all-or-nothing sample import. Never runs on application startup. */
export async function seedSampleData(
  db: PrismaClient,
  password: string,
  username = "Aravind",
) {
  const input = z
    .object({
      password: z.string().min(12).max(128),
      username: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_.@-]+$/),
    })
    .parse({ password, username });
  if (await db.setting.findUnique({ where: { key: marker } }))
    return { created: false, reason: "Sample dataset already present" };
  const ownerHash = await hash(input.password, 12);
  const staffHash = await hash(randomBytes(32).toString("hex"), 12);
  return db.$transaction(
    async (tx) => {
      if (await tx.setting.findUnique({ where: { key: marker } }))
        return { created: false, reason: "Sample dataset already present" };
      const existing = await Promise.all([
        tx.product.count(),
        tx.supplier.count(),
        tx.customer.count(),
        tx.order.count(),
        tx.growingBatch.count(),
        tx.expense.count(),
        tx.payment.count(),
      ]);
      if (existing.some(Boolean))
        throw new Error(
          "Sample import requires an empty business database. Existing records are never deleted or overwritten.",
        );
      let owner = await tx.user.findUnique({
        where: { username: input.username.toLowerCase() },
      });
      if (owner && owner.role !== "OWNER")
        throw new Error(
          "Requested username is already assigned to a non-owner account.",
        );
      if (!owner)
        owner = await tx.user.create({
          data: {
            username: input.username.toLowerCase(),
            name: input.username,
            passwordHash: ownerHash,
            role: "OWNER",
          },
        });
      const actor = owner.id;
      const log = async (
        entity: string,
        entityId: string,
        action: string,
        newValue: Prisma.InputJsonValue,
      ) =>
        tx.auditLog.create({
          data: { actorId: actor, entity, entityId, action, newValue },
        });
      await log("users", owner.id, "SAMPLE_OWNER", {
        username: owner.username,
        role: owner.role,
      });
      const staff = [];
      for (const [username, name, role] of [
        ["sample-manager", "Sample Production Manager", "PRODUCTION_MANAGER"],
        ["sample-worker", "Sample Farm Worker", "FARM_WORKER"],
        ["sample-sales", "Sample Sales Coordinator", "SALES"],
        ["sample-driver", "Sample Delivery Driver", "DELIVERY"],
      ]) {
        // Random, undisclosed credentials: only Aravind has a supplied sign-in password.
        const user = await tx.user.create({
          data: { username, name, role, passwordHash: staffHash },
        });
        staff.push(user);
        await log("users", user.id, "SAMPLE_CREATED", { name, role });
      }
      const driver = staff.find((u) => u.role === "DELIVERY")!;
      const settings: Record<string, string> = {
        businessName: "Kovai Greens",
        farmAddress: "Sample farm, Thudiyalur, Coimbatore, Tamil Nadu",
        phone: "0000000000",
        currency: "INR",
        timezone: "Asia/Kolkata",
        sampleDataNotice:
          "Fictional sample records for exploration; not actual business transactions.",
      };
      for (const [key, value] of Object.entries(settings))
        await tx.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      const suppliers = [];
      for (const [i, name] of [
        "Sample Kongu Seeds",
        "Sample Western Ghats Growers",
        "Sample Green Valley Supplies",
      ].entries()) {
        const r = await tx.supplier.create({
          data: {
            name,
            contact: "Sample supplier contact",
            phone: "0000000000",
            email: `supplier${i + 1}@example.test`,
            address: "Sample business address, Coimbatore",
            suppliedProducts: "Microgreen seeds",
          },
        });
        suppliers.push(r);
        await log("suppliers", r.id, "SAMPLE_CREATED", { name });
      }
      const customers = [];
      for (const [i, type] of [
        "INDIVIDUAL",
        "INDIVIDUAL",
        "SCHOOL",
        "SCHOOL",
        "RESTAURANT",
        "RESTAURANT",
        "CAFE",
        "HOTEL",
        "RETAILER",
        "INSTITUTION",
        "INDIVIDUAL",
        "RETAILER",
      ].entries()) {
        const area = ["Thudiyalur", "Saibaba Colony", "RS Puram", "Peelamedu"][
          i % 4
        ];
        const r = await tx.customer.create({
          data: {
            name: `Sample ${type.toLowerCase()} ${i + 1}`,
            type,
            phone: "0000000000",
            email: `customer${i + 1}@example.test`,
            billingAddress: `${i + 1} Sample Street, ${area}`,
            deliveryAddress: `${i + 1} Sample Street, ${area}`,
            area,
            pincode: "641034",
            paymentTermsDays: type === "SCHOOL" ? 30 : 7,
            notes: "Fictional sample customer",
          },
        });
        customers.push(r);
        await log("customers", r.id, "SAMPLE_CREATED", { name: r.name, type });
      }
      const products = [];
      const lots = [];
      const harvestedBatches = [];
      for (const [i, name] of [
        "Sunflower",
        "Pea Shoots",
        "Radish",
        "Broccoli",
        "Mustard",
        "Red Amaranth",
      ].entries()) {
        const rate = [120000, 100000, 140000, 180000, 120000, 160000][i];
        const p = await tx.product.create({
          data: {
            name,
            variety: name,
            description:
              "Sample product; update growing parameters and prices for your farm.",
            growingDays: 9 + i,
            yieldGramsPerTray: 300,
            seedGramsPerTray: 30,
            pricePaisePerKg: rate,
            lowStockGrams: i === 5 ? 8000 : 1000,
            formats: {
              create: [25, 50, 100, 250].map((grams) => ({
                grams,
                pricePaise: Math.round((rate * grams) / 1000),
              })),
            },
          },
        });
        products.push(p);
        await log("products", p.id, "SAMPLE_CREATED", { name });
        const seed = await tx.seedLot.create({
          data: {
            lotNumber: `SAMPLE-SEED-${i + 1}`,
            productId: p.id,
            supplierId: suppliers[i % 3].id,
            purchasedAt: day(-30),
            expiresAt: day(180),
            purchasedGrams: 20000,
            remainingGrams: 20000,
            costPaise: 60000,
            location: `Seed shelf ${i + 1}`,
          },
        });
        await log("seed-lots", seed.id, "SAMPLE_CREATED", {
          lotNumber: seed.lotNumber,
        });
        const batch = await tx.growingBatch.create({
          data: {
            code: `SAMPLE-HARVEST-${i + 1}`,
            productId: p.id,
            seedLotId: seed.id,
            sownAt: day(-16),
            germinationAt: day(-13),
            harvestDueAt: day(-3),
            trays: 24,
            seedGrams: 720,
            medium: "Coir",
            expectedGrams: 7200,
            status: "HARVESTED",
            notes: "Sample harvested batch",
          },
        });
        harvestedBatches.push(batch);
        await log("batches", batch.id, "SAMPLE_CREATED", {
          status: "HARVESTED",
        });
        const harvest = await tx.harvest.create({
          data: {
            batchId: batch.id,
            productId: p.id,
            harvestedAt: day(-3),
            harvestedGrams: 6600,
            usableGrams: 6000,
            rejectedGrams: 600,
            grade: "A",
            employeeId: staff[1].id,
            notes: "Sample quality observation",
          },
        });
        const lot = await tx.inventoryLot.create({
          data: {
            harvestId: harvest.id,
            onHandGrams: 6000,
            bestBefore: day(3, 18),
          },
        });
        lots.push(lot);
        await tx.stockMovement.create({
          data: {
            lotId: lot.id,
            kind: "HARVEST",
            onHandDelta: 6000,
            reservedDelta: 0,
            packedDelta: 0,
            reference: harvest.id,
            actorId: actor,
          },
        });
        await log("harvests", harvest.id, "SAMPLE_CREATED", {
          usableGrams: 6000,
          rejectedGrams: 600,
        });
        const states = [
          "PLANNED",
          "SOWN",
          "GERMINATING",
          "GROWING",
          "READY_TO_HARVEST",
          "GROWING",
        ];
        const status = states[i];
        const next = await tx.growingBatch.create({
          data: {
            code: `SAMPLE-GROW-${i + 1}`,
            productId: p.id,
            seedLotId: seed.id,
            sownAt: day(status === "PLANNED" ? 1 : -6),
            germinationAt: day(status === "PLANNED" ? 3 : -3),
            harvestDueAt: day(status === "READY_TO_HARVEST" ? 0 : i + 2),
            trays: 12,
            seedGrams: 360,
            medium: "Coir",
            expectedGrams: 3600,
            status,
            notes: "Sample active production batch",
          },
        });
        await tx.seedLot.update({
          where: { id: seed.id },
          data: {
            remainingGrams: {
              decrement: 720 + (status === "PLANNED" ? 0 : 360),
            },
          },
        });
        await log("batches", next.id, "SAMPLE_CREATED", { status });
        await tx.expense.create({
          data: {
            category: "SEEDS",
            description: `Sample seed purchase: ${name}`,
            amountPaise: 60000,
            incurredAt: day(-30),
            actorId: actor,
          },
        });
        for (const [category, amountPaise] of [
          ["GROWING_MEDIA", 8000],
          ["LABOUR", 12000],
          ["PACKAGING", 4000],
        ] as const)
          await tx.expense.create({
            data: {
              category,
              description: `Sample ${category.toLowerCase()} for ${batch.code}`,
              amountPaise,
              incurredAt: day(-3),
              batchId: batch.id,
              actorId: actor,
            },
          });
      }
      const schedules = [];
      for (let i = 0; i < 4; i++) {
        const school = i < 2;
        const p = products[i];
        const p2 = products[(i + 1) % 6];
        const packGrams = school ? 25 : 100;
        const quantity = school ? 20 : 2;
        const items = [p, p2].map((product) => ({
          productId: product.id,
          packGrams,
          quantity,
          unitPricePaise: Math.round(
            (product.pricePaisePerKg * packGrams) / 1000,
          ),
        }));
        const r = await tx.schedule.create({
          data: {
            customerId: customers[school ? i + 2 : i - 2].id,
            kind: school ? "SCHOOL" : "SUBSCRIPTION",
            name: school
              ? `Sample school greens program ${i + 1}`
              : `Sample household greens box ${i - 1}`,
            ...items[0],
            weekdays: school ? [1, 3, 5] : [2, 6],
            startAt: day(-7),
            endAt: day(90),
            participatingStudents: school ? 20 : null,
            grades: school ? "Grades 6–8" : "",
            billingCycle: school ? "MONTHLY" : "PER_ORDER",
            items: { create: items },
          },
        });
        schedules.push(r);
        await log("schedules", r.id, "SAMPLE_CREATED", { kind: r.kind });
      }
      const states = [
        "DELIVERED",
        "DELIVERED",
        "DELIVERED",
        "DELIVERED",
        "DELIVERED",
        "DELIVERED",
        "DELIVERED",
        "DELIVERED",
        "PACKED",
        "PACKED",
        "PACKED",
        "CONFIRMED",
        "ALLOCATED",
        "PACKING",
        "OUT_FOR_DELIVERY",
        "OUT_FOR_DELIVERY",
        "DRAFT",
        "DRAFT",
        "DRAFT",
        "CANCELLED",
      ];
      for (const [i, status] of states.entries()) {
        const customer = customers[i % customers.length];
        const createdAt = day(status === "DELIVERED" ? -3 + (i % 3) : 0, 10);
        const deliveryAt = day(
          status === "DELIVERED" ? -2 + (i % 3) : i % 3,
          16,
        );
        const itemData = [products[i % 6], products[(i + 1) % 6]].map((p) => ({
          productId: p.id,
          packGrams: 100,
          quantity: 2,
          unitPricePaise: Math.round(p.pricePaisePerKg / 10),
        }));
        const total = itemData.reduce(
          (s, x) => s + x.quantity * x.unitPricePaise,
          0,
        );
        const order = await tx.order.create({
          data: {
            number: `SAMPLE-ORD-${String(i + 1).padStart(3, "0")}`,
            customerId: customer.id,
            deliveryAt,
            status,
            subtotalPaise: total,
            totalPaise: total,
            createdAt,
            notes: "Fictional sample order",
            items: { create: itemData },
          },
          include: { items: true },
        });
        await log("orders", order.id, "SAMPLE_CREATED", {
          status,
          totalPaise: total,
        });
        if (!["DRAFT", "CANCELLED"].includes(status)) {
          for (const item of order.items) {
            const lot =
              lots[products.findIndex((p) => p.id === item.productId)];
            const grams = item.packGrams * item.quantity;
            const allocation = await tx.allocation.create({
              data: { itemId: item.id, lotId: lot.id, grams },
            });
            const move = async (
              kind: string,
              onHandDelta: number,
              reservedDelta: number,
              packedDelta: number,
            ) => {
              await tx.inventoryLot.update({
                where: { id: lot.id },
                data: {
                  onHandGrams: { increment: onHandDelta },
                  reservedGrams: { increment: reservedDelta },
                  packedGrams: { increment: packedDelta },
                },
              });
              await tx.stockMovement.create({
                data: {
                  lotId: lot.id,
                  kind,
                  onHandDelta,
                  reservedDelta,
                  packedDelta,
                  reference: order.id,
                  actorId: actor,
                  createdAt,
                },
              });
            };
            await move("RESERVE", 0, grams, 0);
            if (["PACKED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status)) {
              await move("PACK", 0, -grams, grams);
              const packing = await tx.packingBatch.create({
                data: {
                  allocationId: allocation.id,
                  packs: item.quantity,
                  packGrams: item.packGrams,
                  packedAt: createdAt,
                  packedBy: staff[1].id,
                  bestBefore: lot.bestBefore,
                  status: status === "DELIVERED" ? "DELIVERED" : "PACKED",
                },
              });
              await log("packing", packing.id, "SAMPLE_CREATED", {
                packs: item.quantity,
              });
            }
            if (status === "DELIVERED")
              await move("DELIVER", -grams, 0, -grams);
          }
          const delivery = await tx.delivery.create({
            data: {
              orderId: order.id,
              address: customer.deliveryAddress,
              area: customer.area,
              deliveryAt,
              timeSlot: "3:00–5:00 PM",
              route: i % 2 ? "Coimbatore South" : "Coimbatore North",
              driverId: driver.id,
              vehicle: "Sample delivery vehicle",
              status:
                status === "DELIVERED"
                  ? "DELIVERED"
                  : status === "OUT_FOR_DELIVERY"
                    ? "OUT_FOR_DELIVERY"
                    : "ASSIGNED",
              notes: "Sample delivery",
            },
          });
          await log("deliveries", delivery.id, "SAMPLE_CREATED", {
            status: delivery.status,
          });
          if (i < 10) {
            const amountPaise = i % 3 === 0 ? Math.floor(total / 2) : total;
            const payment = await tx.payment.create({
              data: {
                orderId: order.id,
                amountPaise,
                method: i % 2 ? "UPI" : "BANK_TRANSFER",
                reference: `SAMPLE-PAY-${i + 1}`,
                requestKey: `sample-payment-${i + 1}`,
                paidAt: status === "DELIVERED" ? deliveryAt : createdAt,
                actorId: actor,
                createdAt,
              },
            });
            await log("payments", payment.id, "SAMPLE_CREATED", {
              amountPaise,
            });
          }
        }
      }
      for (const schedule of schedules) {
        const dates = occurrences(schedule, day(1), day(8));
        const occurrenceDate = dates[0];
        if (!occurrenceDate)
          throw new Error("No upcoming sample schedule date");
        const deliveryAt = new Date(occurrenceDate + "T09:00:00+05:30");
        const items = await tx.scheduleItem.findMany({
          where: { scheduleId: schedule.id },
        });
        const total = items.reduce(
          (sum, item) => sum + item.quantity * item.unitPricePaise,
          0,
        );
        const order = await tx.order.create({
          data: {
            number: `SAMPLE-REC-${schedules.indexOf(schedule) + 1}`,
            customerId: schedule.customerId,
            deliveryAt,
            scheduleId: schedule.id,
            occurrenceDate,
            subtotalPaise: total,
            totalPaise: total,
            notes: "Sample recurring demand",
            items: {
              create: items.map(
                ({ productId, packGrams, quantity, unitPricePaise }) => ({
                  productId,
                  packGrams,
                  quantity,
                  unitPricePaise,
                }),
              ),
            },
          },
        });
        await log("orders", order.id, "SAMPLE_CREATED", {
          status: "DRAFT",
          scheduleId: schedule.id,
        });
      }
      await tx.inventoryLot.update({
        where: { id: lots[0].id },
        data: { onHandGrams: { decrement: 100 } },
      });
      await tx.stockMovement.create({
        data: {
          lotId: lots[0].id,
          kind: "DISCARD",
          onHandDelta: -100,
          reservedDelta: 0,
          packedDelta: 0,
          reference: "Sample quality discard",
          actorId: actor,
        },
      });
      for (const [category, amountPaise] of [
        ["RENT", 45000],
        ["WATER", 2500],
        ["ELECTRICITY", 6000],
        ["TRANSPORTATION", 8000],
        ["LABELS", 2500],
        ["TRAYS", 12000],
        ["MARKETING", 5000],
        ["EQUIPMENT", 20000],
        ["MISCELLANEOUS", 1000],
      ] as const) {
        const expense = await tx.expense.create({
          data: {
            category,
            description: `Sample ${category.toLowerCase()} expense`,
            amountPaise,
            incurredAt: day(-1),
            actorId: actor,
          },
        });
        await log("expenses", expense.id, "SAMPLE_CREATED", {
          category,
          amountPaise,
        });
      }
      await log("settings", "business", "SAMPLE_CREATED", settings);
      await tx.setting.create({ data: { key: marker, value: "1" } });
      return {
        created: true,
        products: 6,
        suppliers: 3,
        customers: 12,
        batches: 12,
        harvests: 6,
        orders: 24,
        schedules: 4,
        users: 5,
      };
    },
    {
      maxWait: 20000,
      timeout: 120000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

if (require.main === module) {
  const db = new PrismaClient();
  seedSampleData(
    db,
    process.env.OWNER_PASSWORD || "",
    process.env.OWNER_USERNAME || "Aravind",
  )
    .then((result) => console.log("Sample database import:", result))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
