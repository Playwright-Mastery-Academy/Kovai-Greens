import { type Row, money, weight, date, title } from "./api";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  source?: string;
  required?: boolean;
  default?: any;
  help?: string;
};
const f = (
  key: string,
  label: string,
  type = "text",
  extra: Partial<Field> = {},
): Field => ({ key, label, type, required: true, ...extra });
const txt = (key: string, label: string) =>
  f(key, label, "text", { required: false });
const ref = (key: string, label: string, source: string) =>
  f(key, label, "select", { source });
const num = (key: string, label: string, defaultValue?: number) =>
  f(key, label, "number", { default: defaultValue });
const dt = (key: string, label: string) => f(key, label, "date");
export const fields: Record<string, Field[]> = {
  products: [
    f("name", "Product name"),
    f("variety", "Variety"),
    txt("description", "Description"),
    num("growingDays", "Growing duration (days)", 7),
    num("yieldGramsPerTray", "Expected yield / tray (g)", 300),
    num("seedGramsPerTray", "Seeds / tray (g)", 30),
    num("pricePaisePerKg", "Selling price / kg (₹)"),
    num("lowStockGrams", "Low-stock alert threshold (g)", 0),
    txt("storageInstructions", "Storage instructions"),
  ],
  suppliers: [
    f("name", "Supplier name"),
    txt("contact", "Contact person"),
    f("phone", "Phone", "tel"),
    txt("email", "Email"),
    txt("address", "Address"),
    txt("suppliedProducts", "Products supplied"),
    txt("gst", "GST details"),
  ],
  "seed-lots": [
    f("lotNumber", "Seed lot number"),
    ref("productId", "Variety", "products"),
    ref("supplierId", "Supplier", "suppliers"),
    dt("purchasedAt", "Purchase date"),
    dt("expiresAt", "Expiry date"),
    num("purchasedGrams", "Quantity purchased (g)"),
    num("costPaise", "Purchase cost (₹)"),
    f("location", "Storage location"),
  ],
  batches: [
    ref("productId", "Variety", "products"),
    ref("seedLotId", "Seed lot", "seed-lots"),
    dt("sownAt", "Sowing date"),
    dt("germinationAt", "Expected germination"),
    dt("harvestDueAt", "Expected harvest"),
    num("trays", "Number of trays"),
    num("seedGrams", "Seed quantity (g)"),
    f("medium", "Growing medium"),
    txt("notes", "Notes"),
  ],
  harvests: [
    ref("batchId", "Growing batch", "batches"),
    dt("harvestedAt", "Harvest date"),
    num("harvestedGrams", "Harvested quantity (g)"),
    num("usableGrams", "Usable quantity (g)"),
    f("grade", "Quality grade"),
    f("bestBefore", "Best before", "date", {
      required: false,
      help: "Only set a date validated by your business.",
    }),
    txt("notes", "Notes"),
  ],
  customers: [
    f("name", "Customer / business name"),
    f("type", "Customer type", "select", {
      options: [
        "INDIVIDUAL",
        "SCHOOL",
        "RESTAURANT",
        "CAFE",
        "HOTEL",
        "RETAILER",
        "INSTITUTION",
      ],
    }),
    txt("contact", "Contact person"),
    f("phone", "Phone", "tel"),
    txt("email", "Email"),
    f("billingAddress", "Billing address"),
    f("deliveryAddress", "Delivery address"),
    f("area", "Area"),
    f("city", "City", "text", { default: "Coimbatore" }),
    f("pincode", "Pincode"),
    num("paymentTermsDays", "Payment terms (days)", 0),
    txt("notes", "Notes"),
  ],
  orders: [
    ref("customerId", "Customer", "customers"),
    dt("deliveryAt", "Delivery date"),
    num("discountPaise", "Discount (₹)", 0),
    num("taxPaise", "Tax (₹)", 0),
    txt("notes", "Notes"),
  ],
  schedules: [
    f("name", "Program / subscription name"),
    ref("customerId", "Customer", "customers"),
    f("kind", "Type", "select", { options: ["SUBSCRIPTION", "SCHOOL"] }),
    f("weekdays", "Delivery weekdays", "weekdays"),
    dt("startAt", "Start date"),
    f("endAt", "End date", "date", { required: false }),
    f("participatingStudents", "Participating students (aggregate)", "number", {
      required: false,
    }),
    txt("grades", "Classes / grades"),
    f("billingCycle", "Billing cycle", "select", {
      options: ["PER_ORDER", "MONTHLY"],
    }),
  ],
  payments: [
    ref("orderId", "Order", "orders"),
    num("amountPaise", "Amount (₹)"),
    f("method", "Payment method", "select", {
      options: ["UPI", "CASH", "BANK_TRANSFER", "CARD", "OTHER"],
    }),
    f("reference", "Payment reference"),
    f("kind", "Transaction type", "select", { options: ["PAYMENT", "REFUND"] }),
    dt("paidAt", "Payment date"),
  ],
  expenses: [
    f("category", "Category", "select", {
      options: [
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
      ],
    }),
    f("description", "Description"),
    num("amountPaise", "Amount (₹)"),
    dt("incurredAt", "Expense date"),
    f("batchId", "Allocate to growing batch", "select", {
      source: "batches",
      required: false,
      help: "Optional. Seed cost is already derived from seed usage; allocate other direct production costs here.",
    }),
  ],
  users: [
    f("name", "Full name"),
    f("username", "Username"),
    f("password", "Temporary password", "password", {
      help: "At least 10 characters for Admin/Guest; 12 for other roles. Share securely.",
    }),
    f("role", "Role", "select", {
      options: [
        "ADMIN",
        "GUEST",
        "PRODUCTION_MANAGER",
        "FARM_WORKER",
        "SALES",
        "DELIVERY",
      ],
    }),
  ],
};
for (const resource of ["products", "customers", "suppliers"])
  fields[resource].push(f("active", "Active", "checkbox", { default: true }));
export const names: Record<string, string> = {
  products: "Products",
  suppliers: "Suppliers",
  "seed-lots": "Seed inventory",
  batches: "Growing batches",
  harvests: "Harvests",
  inventory: "Inventory",
  customers: "Customers",
  orders: "Orders",
  schedules: "Subscriptions",
  schools: "School programs",
  payments: "Payments",
  expenses: "Expenses",
  users: "Team & access",
  deliveries: "Deliveries",
  packing: "Packing",
  audit: "Audit log",
  movements: "Stock movements",
};
export const singular: Record<string, string> = {
  products: "product",
  suppliers: "supplier",
  "seed-lots": "seed lot",
  batches: "growing batch",
  harvests: "harvest",
  customers: "customer",
  orders: "order",
  schedules: "subscription",
  schools: "school program",
  payments: "payment",
  expenses: "expense",
  users: "team member",
};
export const descriptions: Record<string, string> = {
  products: "Varieties, growing parameters and selling formats.",
  suppliers: "The partners behind every seed lot.",
  "seed-lots": "Seed purchases, remaining quantities and expiry dates.",
  batches: "Follow each crop from sowing to harvest.",
  harvests: "Record yield, quality and usable produce.",
  inventory: "Available, reserved and packed stock by harvest lot.",
  customers: "Households, businesses and institutions you supply.",
  orders: "Manage demand from the first order to the final delivery.",
  schedules: "Plan recurring supply without duplicate orders.",
  schools: "Manage school supply using aggregate student counts.",
  deliveries: "Coordinate routes and deliveries across Coimbatore.",
  packing: "Every pack connected to its harvest and customer.",
  payments: "Receipts, refunds and outstanding balances.",
  expenses: "Keep track of the cost of running your farm.",
  users: "Assign access to the people running your business.",
  audit: "An accountable history of important business changes.",
  movements: "Every change to harvested inventory, recorded.",
};
export type Column = {
  headerName: string;
  valueGetter: (p: { data: Row }) => any;
  field?: string;
  minWidth?: number;
  flex?: number;
  cellRenderer?: any;
};
const col = (label: string, fn: (r: Row) => any, minWidth = 150): Column => ({
  headerName: label,
  valueGetter: (p) => fn(p.data),
  minWidth,
  flex: 1,
});
const status = col(
  "Status",
  (r) => r.status || (r.active === false ? "INACTIVE" : "ACTIVE"),
);
export const columns: Record<string, Column[]> = {
  products: [
    col("Product", (r) => r.name),
    col("Variety", (r) => r.variety),
    col("Growing days", (r) => r.growingDays),
    col("Yield / tray", (r) => weight(r.yieldGramsPerTray)),
    col("Price / kg", (r) => money(r.pricePaisePerKg)),
    status,
  ],
  suppliers: [
    col("Supplier", (r) => r.name),
    col("Contact", (r) => r.contact),
    col("Phone", (r) => r.phone),
    col("Supplies", (r) => r.suppliedProducts),
    status,
  ],
  "seed-lots": [
    col("Lot number", (r) => r.lotNumber),
    col("Variety", (r) => r.product?.name),
    col("Supplier", (r) => r.supplier?.name),
    col("Remaining", (r) => weight(r.remainingGrams)),
    col("Expires", (r) => date(r.expiresAt)),
    col("Location", (r) => r.location),
  ],
  batches: [
    col("Batch", (r) => r.code, 210),
    col("Variety", (r) => r.product?.name),
    col("Trays", (r) => r.trays, 90),
    col("Sown", (r) => date(r.sownAt)),
    col("Harvest due", (r) => date(r.harvestDueAt)),
    col("Expected yield", (r) => weight(r.expectedGrams)),
    status,
  ],
  harvests: [
    col("Growing batch", (r) => r.batch?.code, 210),
    col("Variety", (r) => r.product?.name),
    col("Harvested", (r) => date(r.harvestedAt)),
    col("Usable", (r) => weight(r.usableGrams)),
    col("Rejected", (r) => weight(r.rejectedGrams)),
    col(
      "Wastage",
      (r) => ((100 * r.rejectedGrams) / r.harvestedGrams).toFixed(1) + "%",
    ),
    col("Grade", (r) => r.grade),
  ],
  inventory: [
    col("Variety", (r) => r.harvest?.product?.name),
    col("Batch", (r) => r.harvest?.batch?.code, 210),
    col("On hand", (r) => weight(r.onHandGrams)),
    col("Reserved", (r) => weight(r.reservedGrams)),
    col("Packed", (r) => weight(r.packedGrams)),
    col("Available to sell", (r) =>
      weight(
        r.bestBefore && new Date(r.bestBefore) < new Date()
          ? 0
          : r.onHandGrams - r.reservedGrams - r.packedGrams,
      ),
    ),
    col("Best before", (r) => date(r.bestBefore)),
  ],
  customers: [
    col("Customer", (r) => r.name, 220),
    col("Type", (r) => title(r.type)),
    col("Contact", (r) => r.contact || r.phone),
    col("Area", (r) => r.area),
    col("Phone", (r) => r.phone),
    status,
  ],
  orders: [
    col("Order", (r) => r.number),
    col("Customer", (r) => r.customer?.name, 210),
    col("Delivery date", (r) => date(r.deliveryAt)),
    col("Items", (r) => r.items?.length, 80),
    col("Total", (r) => money(r.totalPaise)),
    col("Payment", (r) => r.paymentStatus),
    status,
  ],
  schedules: [
    col("Program", (r) => r.name, 230),
    col("Customer", (r) => r.customer?.name, 220),
    col("Products", (r) =>
      r.items?.length
        ? r.items.map((i: Row) => i.product?.name).join(", ")
        : r.product?.name,
    ),
    col("Packs", (r) =>
      r.items?.length
        ? r.items.map((i: Row) => `${i.quantity} × ${i.packGrams}g`).join(", ")
        : `${r.quantity} × ${r.packGrams}g`,
    ),
    col("Days", (r) =>
      r.weekdays
        .map(
          (d: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d],
        )
        .join(", "),
    ),
    status,
  ],
  payments: [
    col("Order", (r) => r.order?.number),
    col("Customer", (r) => r.order?.customer?.name, 210),
    col("Amount", (r) => money(r.amountPaise)),
    col("Method", (r) => title(r.method)),
    col("Type", (r) => title(r.kind)),
    col("Paid on", (r) => date(r.paidAt)),
    col("Reference", (r) => r.reference),
  ],
  expenses: [
    col("Category", (r) => title(r.category)),
    col("Description", (r) => r.description, 240),
    col("Amount", (r) => money(r.amountPaise)),
    col("Date", (r) => date(r.incurredAt)),
  ],
  users: [
    col("Name", (r) => r.name),
    col("Username", (r) => r.username, 240),
    col("Role", (r) => title(r.role)),
    status,
  ],
  deliveries: [
    col("Order", (r) => r.order?.number),
    col("Customer", (r) => r.order?.customer?.name, 220),
    col("Area", (r) => r.area),
    col("Date", (r) => date(r.deliveryAt)),
    col("Route", (r) => r.route || "Unassigned"),
    col("Time slot", (r) => r.timeSlot || "—"),
    status,
  ],
  packing: [
    col("Order", (r) => r.allocation?.item?.order?.number),
    col("Product", (r) => r.allocation?.item?.product?.name),
    col("Harvest batch", (r) => r.allocation?.lot?.harvest?.batch?.code, 210),
    col("Packs", (r) => `${r.packs} × ${r.packGrams}g`),
    col("Packed", (r) => date(r.packedAt)),
    col("Best before", (r) => date(r.bestBefore)),
    status,
  ],
  audit: [
    col("Action", (r) => title(r.action)),
    col("Entity", (r) => r.entity),
    col("Record ID", (r) => r.entityId, 250),
    col("User ID", (r) => r.actorId, 250),
    col("Recorded", (r) => date(r.createdAt)),
  ],
  movements: [
    col("Action", (r) => title(r.kind)),
    col("On hand change", (r) => weight(r.onHandDelta)),
    col("Reserved change", (r) => weight(r.reservedDelta)),
    col("Packed change", (r) => weight(r.packedDelta)),
    col("Reference", (r) => r.reference, 250),
    col("Recorded", (r) => date(r.createdAt)),
  ],
};
export const nextStates: Record<string, Record<string, string[]>> = {
  batches: {
    PLANNED: ["SOWN", "CANCELLED"],
    SOWN: ["GERMINATING", "FAILED"],
    GERMINATING: ["GROWING", "FAILED"],
    GROWING: ["READY_TO_HARVEST", "FAILED"],
    READY_TO_HARVEST: ["FAILED"],
  },
  orders: {
    DRAFT: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ALLOCATED", "CANCELLED"],
    ALLOCATED: ["PACKING", "CANCELLED"],
    PACKING: ["PACKED", "CANCELLED"],
    PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY: ["DELIVERED"],
  },
  schedules: {
    ACTIVE: ["PAUSED", "CANCELLED"],
    PAUSED: ["ACTIVE", "CANCELLED"],
  },
};
