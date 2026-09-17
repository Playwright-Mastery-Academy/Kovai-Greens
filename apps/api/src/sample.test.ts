import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_API_URL;
test(
  "Vercel handler: username login and persistent sample records across all modules",
  { skip: !base },
  async () => {
    const login = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ArAvInD",
        password: process.env.TEST_OWNER_PASSWORD,
      }),
    });
    assert.equal(login.status, 201);
    const session = await login.json();
    assert.equal(session.user.name, "Aravind");
    const get = async (path: string) => {
      const response = await fetch(base + "/api/" + path, {
        headers: { Authorization: "Bearer " + session.accessToken },
      });
      assert.equal(response.status, 200, path + ": " + response.status);
      return response.json();
    };
    for (const [resource, count] of Object.entries({
      products: 6,
      suppliers: 3,
      "seed-lots": 6,
      customers: 12,
      batches: 12,
      harvests: 6,
      inventory: 6,
      orders: 24,
      schedules: 4,
      packing: 26,
      deliveries: 16,
      payments: 10,
      expenses: 33,
      users: 5,
    })) {
      const result = await get(resource);
      assert.equal(result.total, count, resource);
    }
    assert.equal((await get("schedules?kind=SCHOOL")).total, 2);
    assert.equal((await get("schedules?kind=SUBSCRIPTION")).total, 2);
    const rewritten = await fetch(base + "/api/index?__path=products&limit=1", {
      headers: { Authorization: "Bearer " + session.accessToken },
    });
    assert.equal(rewritten.status, 200);
    assert.equal((await rewritten.json()).data.length, 1);
    const stock = (await get("inventory")).data;
    const movements = (await get("movements?limit=500")).data;
    for (const lot of stock) {
      const ledger = movements.filter((m: any) => m.lotId === lot.id);
      assert.equal(
        lot.onHandGrams,
        ledger.reduce((s: number, m: any) => s + m.onHandDelta, 0),
      );
      assert.equal(
        lot.reservedGrams,
        ledger.reduce((s: number, m: any) => s + m.reservedDelta, 0),
      );
      assert.equal(
        lot.packedGrams,
        ledger.reduce((s: number, m: any) => s + m.packedDelta, 0),
      );
      assert.ok(lot.onHandGrams >= lot.reservedGrams + lot.packedGrams);
    }
    const orders = (await get("orders")).data;
    const delivered = orders.find((o: any) => o.status === "DELIVERED");
    const trace = await get("traceability/" + delivered.id);
    assert.ok(
      trace.record.items[0].allocations[0].lot.harvest.batch.seedLot.supplier
        .name,
    );
    const planning = await get(
      "planning?to=" +
        encodeURIComponent(new Date(Date.now() + 30 * 86400000).toISOString()),
    );
    assert.ok(planning.some((p: any) => p.demandGrams > 0));
    const dashboard = await get("dashboard");
    assert.ok(dashboard.lowInventory.length > 0);
    const from = new Date(Date.now() - 40 * 86400000).toISOString(),
      to = new Date(Date.now() + 86400000).toISOString();
    const reports = await get(
      "reports?from=" +
        encodeURIComponent(from) +
        "&to=" +
        encodeURIComponent(to),
    );
    assert.equal(reports.costRows.length, 6);
    assert.ok(reports.salesPaise > 0);
    assert.ok((await get("audit")).total > 50);
    assert.equal((await get("settings")).businessName, "Kovai Greens");
    const month = new Date(Date.now() + 19800000).toISOString().slice(0, 7);
    assert.ok((await get("billing?month=" + month)).statements.length > 0);
    assert.equal((await fetch(base + "/api/cron/recurrence")).status, 401);
    const bad = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Aravind", password: "incorrect" }),
    });
    assert.equal(bad.status, 401);
  },
);
