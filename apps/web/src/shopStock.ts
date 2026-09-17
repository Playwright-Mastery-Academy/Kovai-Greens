export type StockItem = { productId: string; packGrams: number; quantity: number };
// Allocate whole packs from individual lots, largest first, matching checkout confirmation.
export function remainingStock(lots: number[], items: StockItem[]) {
  const remaining = [...lots];
  let valid = true;
  for (const item of [...items].sort((a, b) => b.packGrams - a.packGrams)) {
    let packs = item.quantity;
    for (let i = 0; i < remaining.length; i++) {
      const taken = Math.min(packs, Math.floor(remaining[i] / item.packGrams));
      remaining[i] -= taken * item.packGrams;
      packs -= taken;
      if (!packs) break;
    }
    if (packs > 0) valid = false;
  }
  return { lots: remaining, valid };
}
export function packCount(lots: number[], grams: number) {
  return grams > 0 ? lots.reduce((sum, available) => sum + Math.floor(available / grams), 0) : 0;
}
