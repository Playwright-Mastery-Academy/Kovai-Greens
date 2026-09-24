import { z } from "zod";
import { roles } from "./domain";
const text = z.string().trim().min(1).max(500),
  optional = z.string().trim().max(2000).default(""),
  id = z.string().uuid(),
  positive = z.number().int().positive().max(100000000),
  money = z.number().int().min(0).max(1000000000),
  date = z.coerce.date(),
  phone = z.string().trim().min(7).max(20),
  email = z.union([z.string().email(), z.literal("")]).default("");
export const schemas = {
  products: z
    .object({
      name: text,
      variety: text,
      description: optional,
      growingDays: positive.max(365),
      yieldGramsPerTray: positive,
      seedGramsPerTray: positive,
      pricePaisePerKg: money,
      lowStockGrams: z.number().int().min(0).max(100000000).default(0),
      storageInstructions: optional,
      active: z.boolean().default(true),
      formats: z
        .array(z.object({ grams: positive, pricePaise: money }))
        .min(1)
        .max(20),
    })
    .strict(),
  suppliers: z
    .object({
      name: text,
      contact: optional,
      phone,
      email,
      address: optional,
      suppliedProducts: optional,
      gst: optional,
      active: z.boolean().default(true),
    })
    .strict(),
  "seed-lots": z
    .object({
      lotNumber: text,
      productId: id,
      supplierId: id,
      purchasedAt: date,
      expiresAt: date,
      purchasedGrams: positive,
      costPaise: money,
      location: text,
    })
    .strict()
    .refine((v) => v.expiresAt > v.purchasedAt, "Expiry must follow purchase"),
  batches: z
    .object({
      productId: id,
      seedLotId: id,
      sownAt: date,
      germinationAt: date,
      harvestDueAt: date,
      trays: positive.max(100000),
      seedGrams: positive,
      medium: text,
      notes: optional,
    })
    .strict()
    .refine(
      (v) =>
        v.harvestDueAt > v.sownAt &&
        v.germinationAt >= v.sownAt &&
        v.germinationAt <= v.harvestDueAt,
      "Check sowing, germination and harvest dates",
    ),
  harvests: z
    .object({
      batchId: id,
      harvestedAt: date,
      harvestedGrams: positive,
      usableGrams: z.number().int().min(0),
      grade: text,
      notes: optional,
      bestBefore: date.optional(),
    })
    .strict()
    .refine(
      (v) => v.usableGrams <= v.harvestedGrams,
      "Usable quantity exceeds harvest",
    )
    .refine(
      (v) => !v.bestBefore || v.bestBefore > v.harvestedAt,
      "Best before must follow harvest",
    ),
  customers: z
    .object({
      name: text,
      type: z.enum([
        "INDIVIDUAL",
        "SCHOOL",
        "RESTAURANT",
        "CAFE",
        "HOTEL",
        "RETAILER",
        "INSTITUTION",
      ]),
      contact: optional,
      phone,
      email,
      billingAddress: text,
      deliveryAddress: text,
      area: text,
      city: text.default("Coimbatore"),
      pincode: z.string().regex(/^\d{6}$/),
      paymentTermsDays: z.number().int().min(0).max(365).default(0),
      active: z.boolean().default(true),
      notes: optional,
    })
    .strict(),
  orders: z
    .object({
      customerId: id,
      deliveryAt: date,
      items: z
        .array(
          z.object({
            productId: id,
            packGrams: positive,
            quantity: positive.max(100000),
            unitPricePaise: money,
          }),
        )
        .min(1)
        .max(100),
      discountPaise: money.default(0),
      taxPaise: money.default(0),
      notes: optional,
    })
    .strict(),
  schedules: z
    .object({
      customerId: id,
      kind: z.enum(["SUBSCRIPTION", "SCHOOL"]),
      name: text,
      productId: id.optional(),
      packGrams: positive.optional(),
      quantity: positive.max(100000).optional(),
      unitPricePaise: money.optional(),
      items: z
        .array(
          z
            .object({
              productId: id,
              packGrams: positive,
              quantity: positive.max(100000),
              unitPricePaise: money,
            })
            .strict(),
        )
        .min(1)
        .max(100)
        .optional(),
      weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      startAt: date,
      endAt: date.nullable().optional(),
      participatingStudents: positive.nullable().optional(),
      grades: optional,
      billingCycle: z.enum(["PER_ORDER", "MONTHLY"]).default("PER_ORDER"),
    })
    .strict()
    .refine(
      (v) =>
        !!v.items?.length ||
        !!(
          v.productId &&
          v.packGrams &&
          v.quantity &&
          v.unitPricePaise !== undefined
        ),
      "Add at least one recurring product",
    )
    .refine(
      (v) => !v.endAt || v.endAt >= v.startAt,
      "End date must follow start date",
    ),
  payments: z
    .object({
      orderId: id,
      amountPaise: positive,
      method: z.enum(["UPI", "CASH", "BANK_TRANSFER", "CARD", "OTHER"]),
      reference: text,
      requestKey: id,
      kind: z.enum(["PAYMENT", "REFUND"]).default("PAYMENT"),
      paidAt: date,
    })
    .strict(),
  expenses: z
    .object({
      category: z.enum([
        "SEEDS",
        "GROWING_MEDIA",
        "TRAYS",
        "PACKAGING",
        "LABELS",
        "ELECTRICITY",
        "WATER",
        "LABOUR",
        "TRANSPORTATION",
        "RENT",
        "MARKETING",
        "EQUIPMENT",
        "MISCELLANEOUS",
      ]),
      description: text,
      amountPaise: positive,
      incurredAt: date,
      batchId: id.optional(),
    })
    .strict(),
  users: z
    .object({
      name: text,
      username: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_.@-]+$/)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(10).max(128),
      role: z.enum(roles),
    })
    .strict()
    .refine(v => ["ADMIN", "GUEST"].includes(v.role) || v.password.length >= 12, {
      path: ["password"], message: "This role requires at least 12 characters",
    }),
};
export const loginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
