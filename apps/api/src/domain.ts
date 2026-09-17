export const roles = [
  "OWNER",
  "ADMIN",
  "PRODUCTION_MANAGER",
  "FARM_WORKER",
  "SALES",
  "DELIVERY",
] as const;
export const batchSteps: Record<string, string[]> = {
  PLANNED: ["SOWN", "CANCELLED"],
  SOWN: ["GERMINATING", "FAILED"],
  GERMINATING: ["GROWING", "FAILED"],
  GROWING: ["READY_TO_HARVEST", "FAILED"],
  READY_TO_HARVEST: ["FAILED"],
  HARVESTED: [],
  FAILED: [],
  CANCELLED: [],
};
export const orderSteps: Record<string, string[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ALLOCATED", "CANCELLED"],
  ALLOCATED: ["PACKING", "CANCELLED"],
  PACKING: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
export function transition(
  map: Record<string, string[]>,
  from: string,
  to: string,
) {
  if (!map[from]?.includes(to))
    throw new Error(`Cannot change ${from} to ${to}`);
}
export function totals(
  items: { quantity: number; unitPricePaise: number }[],
  discount: number,
  tax: number,
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPricePaise, 0);
  if (discount > subtotal) throw new Error("Discount exceeds subtotal");
  const total = subtotal - discount + tax;
  if (!Number.isSafeInteger(total) || total > 2147483647)
    throw new Error("Order amount is too large");
  return {
    subtotalPaise: subtotal,
    discountPaise: discount,
    taxPaise: tax,
    totalPaise: total,
  };
}
export function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function occurrences(
  s: { startAt: Date; endAt: Date | null; weekdays: number[] },
  from: Date,
  to: Date,
) {
  const result: string[] = [];
  let d = new Date(dayKey(from) + "T00:00:00+05:30");
  for (; d <= to; d = new Date(d.getTime() + 86400000)) {
    const key = dayKey(d);
    const week = new Date(key + "T12:00:00Z").getUTCDay();
    if (
      key >= dayKey(s.startAt) &&
      (!s.endAt || key <= dayKey(s.endAt)) &&
      s.weekdays.includes(week)
    )
      result.push(key);
  }
  return result;
}
export function planDemand(
  demand: number,
  stock: number,
  growing: number,
  yieldPerTray: number,
) {
  return {
    demandGrams: demand,
    stockGrams: stock,
    growingGrams: growing,
    shortageGrams: Math.max(0, demand - stock - growing),
    additionalTrays: Math.ceil(
      Math.max(0, demand - stock - growing) / yieldPerTray,
    ),
  };
}
export function paymentStatus(total: number, net: number, refunded: boolean) {
  return net >= total
    ? "PAID"
    : net > 0
      ? "PARTIALLY_PAID"
      : refunded
        ? "REFUNDED"
        : "UNPAID";
}
