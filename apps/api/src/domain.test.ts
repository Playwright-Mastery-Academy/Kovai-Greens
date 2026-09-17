import test from "node:test";
import assert from "node:assert/strict";
import {
  totals,
  transition,
  orderSteps,
  batchSteps,
  occurrences,
  planDemand,
  dayKey,
  paymentStatus,
} from "./domain";
import { schemas } from "./validation";
test("all money remains integer paise with bounded discounts", () => {
  assert.deepEqual(
    totals([{ quantity: 3, unitPricePaise: 12525 }], 1000, 1800),
    {
      subtotalPaise: 37575,
      discountPaise: 1000,
      taxPaise: 1800,
      totalPaise: 38375,
    },
  );
  assert.throws(() => totals([{ quantity: 1, unitPricePaise: 10 }], 11, 0));
  assert.throws(() =>
    totals([{ quantity: 100000, unitPricePaise: 1000000000 }], 0, 0),
  );
});
test("cannot skip fulfillment or resurrect cancelled orders", () => {
  assert.throws(() => transition(orderSteps, "DRAFT", "DELIVERED"));
  assert.throws(() => transition(orderSteps, "CANCELLED", "CONFIRMED"));
  transition(orderSteps, "PACKING", "PACKED");
});
test("harvest is only recorded by harvest operation", () => {
  assert.throws(() => transition(batchSteps, "READY_TO_HARVEST", "HARVESTED"));
  transition(batchSteps, "GROWING", "READY_TO_HARVEST");
});
test("crop shortage rounds trays upward", () => {
  assert.equal(planDemand(8500, 0, 24 * 300, 300).additionalTrays, 5);
  assert.equal(planDemand(1000, 1200, 300, 300).additionalTrays, 0);
});
test("school recurrence uses IST weekdays with inclusive start/end", () => {
  const s = {
    startAt: new Date("2026-09-01T00:00:00+05:30"),
    endAt: new Date("2026-09-29T00:00:00+05:30"),
    weekdays: [2],
  };
  assert.deepEqual(
    occurrences(
      s,
      new Date("2026-09-17T00:00:00+05:30"),
      new Date("2026-10-02T00:00:00+05:30"),
    ),
    ["2026-09-22", "2026-09-29"],
  );
  assert.equal(dayKey(new Date("2026-09-17T19:00:00Z")), "2026-09-18");
});
test("validation rejects negative inventory and mass overstatement", () => {
  assert.equal(
    schemas.harvests.safeParse({
      batchId: "00000000-0000-4000-8000-000000000000",
      harvestedAt: "2026-09-17",
      harvestedGrams: 500,
      usableGrams: 501,
      grade: "A",
    }).success,
    false,
  );
  assert.equal(
    schemas.orders.safeParse({ customerId: "x", items: [] }).success,
    false,
  );
});
test("school records reject individual-child fields", () => {
  const v = {
    customerId: "00000000-0000-4000-8000-000000000000",
    productId: "00000000-0000-4000-8000-000000000001",
    kind: "SCHOOL",
    name: "Tuesday supply",
    packGrams: 25,
    quantity: 250,
    unitPricePaise: 2000,
    weekdays: [2],
    startAt: "2026-09-01",
    childName: "Not permitted",
  };
  assert.equal(schemas.schedules.safeParse(v).success, false);
});
test("payment status reflects net receipts and full refunds", () => {
  assert.equal(paymentStatus(100, 50, false), "PARTIALLY_PAID");
  assert.equal(paymentStatus(100, 100, false), "PAID");
  assert.equal(paymentStatus(100, 0, true), "REFUNDED");
});
