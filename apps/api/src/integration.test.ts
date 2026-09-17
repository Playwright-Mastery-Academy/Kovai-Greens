import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
const base = process.env.TEST_API_URL;
test(
  "API: full stock lifecycle, concurrent reservation, recurring idempotency and role boundaries",
  { skip: !base },
  async () => {
    const url = base!.replace(/\/$/, "");
    const health = await fetch(url + "/api/health").then((r) => r.json());
    assert.equal(
      health.environment,
      "training",
      "Integration fixtures may only be created in the separate training environment",
    );
    let token = "";
    async function request(
      path: string,
      method = "GET",
      body?: unknown,
      override?: string,
    ) {
      const response = await fetch(url + "/api/" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(override || token
            ? { Authorization: "Bearer " + (override || token) }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, body: await response.json() };
    }
    async function ok(path: string, method = "GET", body?: unknown) {
      const r = await request(path, method, body);
      assert.ok(r.status < 300, `${method} ${path}: ${JSON.stringify(r.body)}`);
      return r.body;
    }
    const login = await ok("auth/login", "POST", {
      username: process.env.TEST_OWNER_USERNAME,
      password: process.env.TEST_OWNER_PASSWORD,
    });
    assert.equal(login.user.role, "OWNER");
    token = login.accessToken;
    const tag = randomUUID().slice(0, 8),
      now = new Date(),
      past = new Date(+now - 10 * 86400000).toISOString(),
      soon = new Date(+now + 86400000).toISOString(),
      future = new Date(+now + 30 * 86400000).toISOString();
    const product = await ok("products", "POST", {
      name: "QA Sunflower " + tag,
      variety: "Sunflower",
      growingDays: 7,
      yieldGramsPerTray: 300,
      seedGramsPerTray: 30,
      pricePaisePerKg: 100000,
      lowStockGrams: 2500,
      formats: [{ grams: 100, pricePaise: 10000 }],
    });
    const supplier = await ok("suppliers", "POST", {
      name: "QA Supplier " + tag,
      phone: "9000000000",
    });
    const seed = await ok("seed-lots", "POST", {
      lotNumber: "QA-" + tag,
      productId: product.id,
      supplierId: supplier.id,
      purchasedAt: past,
      expiresAt: future,
      purchasedGrams: 5000,
      costPaise: 10000,
      location: "QA shelf",
    });
    const batch = await ok("batches", "POST", {
      productId: product.id,
      seedLotId: seed.id,
      sownAt: past,
      germinationAt: past,
      harvestDueAt: soon,
      trays: 40,
      seedGrams: 1200,
      medium: "Coir",
    });
    const invalid = await request("batches/" + batch.id, "PATCH", {
      status: "HARVESTED",
    });
    assert.equal(invalid.status, 400);
    for (const status of ["SOWN", "GERMINATING", "GROWING", "READY_TO_HARVEST"])
      await ok("batches/" + batch.id, "PATCH", { status });
    const harvest = await ok("harvests", "POST", {
      batchId: batch.id,
      harvestedAt: now.toISOString(),
      harvestedGrams: 11000,
      usableGrams: 10000,
      grade: "A",
      bestBefore: future,
    });
    const customer = await ok("customers", "POST", {
      name: "QA School " + tag,
      type: "SCHOOL",
      phone: "9000000000",
      billingAddress: "QA address",
      deliveryAddress: "QA address",
      area: "Thudiyalur",
      pincode: "641034",
    });
    const orderData = {
      customerId: customer.id,
      deliveryAt: soon,
      items: [
        {
          productId: product.id,
          packGrams: 100,
          quantity: 80,
          unitPricePaise: 10000,
        },
      ],
    };
    const a = await ok("orders", "POST", orderData),
      b = await ok("orders", "POST", orderData);
    const confirmed = await Promise.all([
      request("orders/" + a.id, "PATCH", { status: "CONFIRMED" }),
      request("orders/" + b.id, "PATCH", { status: "CONFIRMED" }),
    ]);
    assert.equal(
      confirmed.filter((r) => r.status < 300).length,
      1,
      "Concurrent orders must not oversell",
    );
    const successful = confirmed[0].status < 300 ? a : b;
    const inventory = (await ok("inventory")).data.find(
      (r: any) => r.harvestId === harvest.id,
    );
    assert.equal(inventory.reservedGrams, 8000);
    const trace = await ok("traceability/" + successful.id);
    assert.equal(
      trace.record.items[0].allocations[0].lot.harvest.batch.seedLot.supplier
        .id,
      supplier.id,
    );
    const overDiscard = await request(
      "inventory/" + inventory.id + "/discard",
      "POST",
      { grams: 3000, reason: "QA cannot discard reserved stock" },
    );
    assert.equal(overDiscard.status, 400);
    for (const status of ["ALLOCATED", "PACKING", "PACKED"])
      await ok("orders/" + successful.id, "PATCH", { status });
    const packed = (await ok("inventory")).data.find(
      (r: any) => r.id === inventory.id,
    );
    assert.equal(packed.packedGrams, 8000);
    assert.equal(packed.reservedGrams, 0);
    const payment = {
      orderId: successful.id,
      amountPaise: 10000,
      method: "UPI",
      reference: "QA-" + tag,
      requestKey: randomUUID(),
      paidAt: now.toISOString(),
    };
    const p1 = await ok("payments", "POST", payment),
      p2 = await ok("payments", "POST", payment);
    assert.equal(p1.id, p2.id);
    const password = randomBytes(20).toString("hex");
    const driver = await ok("users", "POST", {
      name: "QA Driver " + tag,
      username: `driver-${tag}@example.test`,
      password,
      role: "DELIVERY",
    });
    const otherDriver = await ok("users", "POST", {
      name: "QA Driver B " + tag,
      username: `driver-b-${tag}@example.test`,
      password,
      role: "DELIVERY",
    });
    const delivery = (await ok("deliveries")).data.find(
      (d: any) => d.orderId === successful.id,
    );
    await ok("deliveries/" + delivery.id, "PATCH", {
      driverId: driver.id,
      status: "ASSIGNED",
    });
    await ok("orders/" + successful.id, "PATCH", {
      status: "OUT_FOR_DELIVERY",
    });
    const driverLogin = await ok("auth/login", "POST", {
      username: `driver-${tag}@example.test`,
      password,
    });
    assert.equal(
      (await request("payments", "GET", undefined, driverLogin.accessToken))
        .status,
      403,
    );
    const delivered = await request(
      "deliveries/" + delivery.id,
      "PATCH",
      { status: "DELIVERED" },
      driverLogin.accessToken,
    );
    assert.ok(delivered.status < 300);
    const otherLogin = await ok("auth/login", "POST", {
      username: `driver-b-${tag}@example.test`,
      password,
    });
    assert.equal(
      (
        await request(
          "deliveries/" + delivery.id,
          "PATCH",
          { status: "FAILED" },
          otherLogin.accessToken,
        )
      ).status,
      403,
    );
    const final = (await ok("inventory")).data.find(
      (r: any) => r.id === inventory.id,
    );
    assert.equal(final.onHandGrams, 2000);
    assert.equal(final.packedGrams, 0);
    await ok("schedules", "POST", {
      name: "QA weekly " + tag,
      kind: "SCHOOL",
      customerId: customer.id,
      productId: product.id,
      packGrams: 100,
      quantity: 5,
      unitPricePaise: 10000,
      weekdays: [2],
      startAt: now.toISOString(),
      endAt: future,
      participatingStudents: 5,
    });
    await ok("schedules/generate", "POST", { through: future });
    const second = await ok("schedules/generate", "POST", { through: future });
    assert.equal(second.created, 0);
    const secondProduct = await ok("products", "POST", {
      name: "QA Pea " + tag,
      variety: "Pea",
      growingDays: 10,
      yieldGramsPerTray: 250,
      seedGramsPerTray: 25,
      pricePaisePerKg: 90000,
      formats: [{ grams: 50, pricePaise: 4500 }],
    });
    const schedule = await ok("schedules", "POST", {
      name: "QA mixed box " + tag,
      kind: "SUBSCRIPTION",
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          packGrams: 100,
          quantity: 2,
          unitPricePaise: 10000,
        },
        {
          productId: secondProduct.id,
          packGrams: 50,
          quantity: 3,
          unitPricePaise: 4500,
        },
      ],
      weekdays: [1, 4],
      startAt: now.toISOString(),
      endAt: future,
    });
    await ok("schedules/generate", "POST", { through: future });
    const recurring = (await ok("orders")).data.filter(
      (o: any) => o.scheduleId === schedule.id,
    );
    assert.ok(recurring.length > 0);
    assert.equal(recurring[0].items.length, 2);
    assert.equal(recurring[0].totalPaise, 33500);
    const planning = await ok("planning?to=" + encodeURIComponent(future));
    assert.ok(
      planning.find((p: any) => p.product.id === secondProduct.id).demandGrams >
        0,
    );
    const packing = (await ok("packing")).data.find(
      (p: any) => p.allocation.item.order.id === successful.id,
    );
    const label = await ok("packing/" + packing.id + "/label");
    assert.ok(label.qrDataUrl.startsWith("data:image/png;base64,"));
    const publicPage = await fetch(
      url + "/api/public/package/" + packing.publicToken,
    ).then((r) => r.text());
    assert.ok(publicPage.includes(product.name));
    assert.ok(!publicPage.includes(customer.name));
    const docs = await fetch(url + "/api/docs-json").then((r) => r.json());
    assert.ok(docs.components.schemas.schedules.properties.items);
    const draft = await ok("orders", "POST", {
      ...orderData,
      items: [
        {
          productId: product.id,
          packGrams: 100,
          quantity: 5,
          unitPricePaise: 10000,
        },
      ],
    });
    await ok("orders/" + draft.id, "PATCH", { status: "CONFIRMED" });
    const rescheduled = (await ok("deliveries")).data.find(
      (d: any) => d.orderId === draft.id,
    );
    await ok("deliveries/" + rescheduled.id, "PATCH", {
      status: "RESCHEDULED",
      deliveryAt: new Date(+now + 2 * 86400000).toISOString(),
      notes: "QA reschedule",
    });
    await ok("orders/" + draft.id, "PATCH", { status: "CANCELLED" });
    const released = (await ok("inventory")).data.find(
      (r: any) => r.id === inventory.id,
    );
    assert.equal(released.reservedGrams, 0);
    const bills = await ok(
      "billing?month=" + new Date(soon).toISOString().slice(0, 7),
    );
    assert.ok(bills.statements.some((b: any) => b.customer.id === customer.id));
    const search = await ok(
      "products?q=" + encodeURIComponent(tag) + "&limit=1&page=1",
    );
    assert.equal(search.total, 2);
    assert.equal(search.data.length, 1);
    const nextPage = await ok(
      "products?q=" + encodeURIComponent(tag) + "&limit=1&page=2",
    );
    assert.notEqual(search.data[0].id, nextPage.data[0].id);
    const nestedSearch = await ok(
      "schedules?kind=SUBSCRIPTION&q=" + encodeURIComponent(secondProduct.name),
    );
    assert.equal(nestedSearch.data[0].id, schedule.id);
    for (const resource of [
      "suppliers",
      "seed-lots",
      "batches",
      "harvests",
      "inventory",
      "customers",
      "orders",
      "payments",
      "expenses",
      "deliveries",
      "packing",
      "audit",
      "movements",
      "users",
    ])
      await ok(resource + "?q=" + encodeURIComponent(tag));
    await ok("expenses", "POST", {
      category: "GROWING_MEDIA",
      description: "QA coir " + tag,
      amountPaise: 2600,
      incurredAt: now.toISOString(),
      batchId: batch.id,
    });
    const report = await ok(
      "reports?from=" +
        encodeURIComponent(past) +
        "&to=" +
        encodeURIComponent(future),
    );
    const costs = report.costRows.find((r: any) => r.batch === batch.code);
    assert.equal(costs.seedCostPaise, 2400);
    assert.equal(costs.allocatedExpensesPaise, 2600);
    assert.equal(costs.totalCostPaise, 5000);
    assert.equal(costs.costPaisePerKg, 500);
    assert.equal(
      report.estimatedGrossProfitPaise,
      report.deliveredNetSalesPaise - report.deliveredCostPaise,
    );
    const dashboard = await ok("dashboard");
    assert.ok(
      dashboard.lowInventory.some(
        (p: any) => p.product === product.name && p.availableGrams === 2000,
      ),
    );
    const ownerToken = token;
    const previousDriverToken = otherLogin.accessToken;
    token = previousDriverToken;
    const changed = await ok("account/password", "POST", {
      currentPassword: password,
      newPassword: randomBytes(24).toString("hex"),
    });
    token = changed.accessToken;
    assert.equal(
      (await request("me", "GET", undefined, previousDriverToken)).status,
      401,
      "Password changes must revoke previous access tokens",
    );
    assert.equal((await ok("me")).id, otherDriver.id);
    token = ownerToken;
    await ok("users/" + driver.id, "PATCH", { active: false });
    await ok("users/" + otherDriver.id, "PATCH", { active: false });
  },
);
