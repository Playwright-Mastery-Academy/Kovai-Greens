import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  Module,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  Injectable,
  CanActivate,
  ExecutionContext,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
  ValidationPipe,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import {
  SwaggerModule,
  DocumentBuilder,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiTags,
} from "@nestjs/swagger";
import { PrismaClient, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { hash, compare } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import { schemas, loginSchema } from "./validation";
import { zodToJsonSchema } from "zod-to-json-schema";
import { publicOrigin, tracePage } from "./public-trace";
const QRCode = require("qrcode") as {
  toDataURL: (text: string, options?: any) => Promise<string>;
};
import {
  batchSteps,
  orderSteps,
  transition,
  totals,
  dayKey,
  occurrences,
  planDemand,
  paymentStatus,
  roles,
} from "./domain";
const db = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error("JWT_SECRET must be at least 32 characters");
const jwtSecret = secret;
const origin =
  process.env.WEB_ORIGIN ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : "http://localhost:4173");
const allowedOrigins = new Set([
  origin,
  ...(process.env.VERCEL_URL ? ["https://" + process.env.VERCEL_URL] : []),
]);
const secure = process.env.NODE_ENV === "production";
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
const cookieOpts = {
  httpOnly: true,
  secure,
  sameSite: (process.env.COOKIE_SAME_SITE === "none" && secure
    ? "none"
    : "strict") as "none" | "strict",
  path: "/api/auth",
  maxAge: 7 * 86400000,
};
type Actor = { id: string; role: string; name: string };
type R = Request & { actor: Actor };
function assert(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new HttpException(msg, 400);
}
const audit = async (
  tx: any,
  a: Actor,
  action: string,
  entity: string,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown,
) =>
  tx.auditLog.create({
    data: {
      actorId: a.id,
      action,
      entity,
      entityId,
      ...(oldValue !== undefined
        ? { oldValue: JSON.parse(JSON.stringify(oldValue)) }
        : {}),
      ...(newValue !== undefined
        ? { newValue: JSON.parse(JSON.stringify(newValue)) }
        : {}),
    },
  });
async function transact<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15000,
      });
    } catch (e: any) {
      if (e.code === "P2034" && i < 2) continue;
      throw e;
    }
  }
  throw new Error("Transaction failed");
}
const rules: Record<string, string[]> = {
  products: ["PRODUCTION_MANAGER", "FARM_WORKER", "SALES"],
  suppliers: ["PRODUCTION_MANAGER"],
  "seed-lots": ["PRODUCTION_MANAGER"],
  batches: ["PRODUCTION_MANAGER", "FARM_WORKER"],
  harvests: ["PRODUCTION_MANAGER", "FARM_WORKER"],
  inventory: ["PRODUCTION_MANAGER", "FARM_WORKER"],
  movements: ["PRODUCTION_MANAGER"],
  planning: ["PRODUCTION_MANAGER"],
  customers: ["SALES"],
  orders: ["SALES", "PRODUCTION_MANAGER", "FARM_WORKER"],
  schedules: ["SALES"],
  payments: ["SALES"],
  deliveries: ["SALES", "DELIVERY"],
  packing: ["PRODUCTION_MANAGER", "FARM_WORKER"],
  traceability: ["PRODUCTION_MANAGER", "SALES"],
  reports: ["SALES"],
  dashboard: ["PRODUCTION_MANAGER", "SALES"],
};
function permit(a: Actor, resource: string, write = false) {
  if (a.role === "OWNER" || a.role === "ADMIN") return;
  assertRole(rules[resource]?.includes(a.role));
  if (write && resource === "products")
    assertRole(a.role === "PRODUCTION_MANAGER");
}
function assertRole(v: unknown) {
  if (!v) throw new ForbiddenException("Your role does not allow this action");
}
@Injectable()
class AuthGuard implements CanActivate {
  async canActivate(c: ExecutionContext) {
    const r = c.switchToHttp().getRequest<R>();
    try {
      const t = r.headers.authorization?.replace(/^Bearer /, "");
      if (!t) throw 0;
      const payload = verify(t, jwtSecret, {
        algorithms: ["HS256"],
        issuer: "kovai-greens",
        audience: "kovai-web",
      }) as any;
      const u = await db.user.findUnique({ where: { id: payload.sub } });
      if (!u?.active || !payload.jti) throw 0;
      const activeSession = await db.session.findUnique({
        where: { id: payload.jti },
      });
      if (
        !activeSession ||
        activeSession.userId !== u.id ||
        activeSession.expiresAt < new Date()
      )
        throw 0;
      r.actor = { id: u.id, name: u.name, role: u.role };
      return true;
    } catch {
      throw new UnauthorizedException("Please sign in");
    }
  }
}
@Catch()
class Errors implements ExceptionFilter {
  catch(e: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (e instanceof ZodError)
      return res.status(400).json({
        message: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (e instanceof HttpException)
      return res.status(e.getStatus()).json({ message: e.message });
    if (e.code === "P2002")
      return res.status(409).json({ message: "This record already exists" });
    if (e.code === "P2025")
      return res.status(404).json({ message: "Record not found" });
    if (e.code === "P2003")
      return res
        .status(400)
        .json({ message: "A referenced record does not exist" });
    if (e.code === "P2034")
      return res
        .status(409)
        .json({ message: "Record changed concurrently. Please retry." });
    console.error(e);
    return res
      .status(500)
      .json({ message: "The operation could not be completed" });
  }
}
const attempts = new Map<string, { count: number; until: number }>();
async function session(
  u: { id: string; role: string; name: string },
  res: Response,
) {
  const token = randomBytes(48).toString("base64url");
  const savedSession = await db.session.create({
    data: {
      userId: u.id,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  res.cookie("refresh", token, cookieOpts);
  return {
    accessToken: sign({ role: u.role }, jwtSecret, {
      subject: u.id,
      jwtid: savedSession.id,
      expiresIn: "15m",
      issuer: "kovai-greens",
      audience: "kovai-web",
    }),
    user: { id: u.id, name: u.name, role: u.role },
  };
}
@ApiTags("Authentication")
@Controller("api/auth")
class AuthController {
  @Post("login")
  @ApiBody({
    schema: {
      type: "object",
      required: ["username", "password"],
      properties: {
        username: { type: "string" },
        password: { type: "string", format: "password" },
      },
    },
  })
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const v = loginSchema.parse(body);
    const key = req.ip + ":" + v.username;
    const a = attempts.get(key);
    if (a && a.until > Date.now() && a.count >= 8)
      throw new HttpException(
        "Too many sign-in attempts. Try again in 15 minutes.",
        429,
      );
    for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k);
    attempts.set(key, {
      count: (a && a.until > Date.now() ? a.count : 0) + 1,
      until: Date.now() + 900000,
    });
    const u = await db.user.findUnique({ where: { username: v.username } });
    if (!u || !u.active || !(await compare(v.password, u.passwordHash)))
      throw new UnauthorizedException("Username or password is incorrect");
    attempts.delete(key);
    return session(u, res);
  }
  @Post("refresh") async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies.refresh;
    if (!token) throw new UnauthorizedException();
    const s = await db.session.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: true },
    });
    if (!s || s.expiresAt < new Date() || !s.user.active)
      throw new UnauthorizedException();
    const consumed = await db.session.deleteMany({
      where: { id: s.id, tokenHash: digest(token) },
    });
    if (consumed.count !== 1) throw new UnauthorizedException();
    return session(s.user, res);
  }
  @Post("logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.cookies.refresh)
      await db.session.deleteMany({
        where: { tokenHash: digest(req.cookies.refresh) },
      });
    res.clearCookie("refresh", cookieOpts);
    return { ok: true };
  }
}
const orderInclude = {
  customer: true,
  items: {
    include: {
      product: true,
      allocations: {
        include: {
          lot: {
            include: {
              harvest: {
                include: {
                  batch: {
                    include: { seedLot: { include: { supplier: true } } },
                  },
                },
              },
            },
          },
          packing: true,
        },
      },
    },
  },
  payments: true,
  delivery: true,
} as const;
const model: Record<string, string> = {
  products: "product",
  suppliers: "supplier",
  "seed-lots": "seedLot",
  batches: "growingBatch",
  harvests: "harvest",
  inventory: "inventoryLot",
  customers: "customer",
  orders: "order",
  schedules: "schedule",
  payments: "payment",
  expenses: "expense",
  deliveries: "delivery",
  packing: "packingBatch",
  movements: "stockMovement",
  audit: "auditLog",
  users: "user",
};
const includes: Record<string, any> = {
  products: { formats: true },
  "seed-lots": { product: true, supplier: true },
  batches: { product: true, seedLot: true, harvests: true },
  harvests: { product: true, batch: true },
  inventory: { harvest: { include: { product: true, batch: true } } },
  orders: orderInclude,
  schedules: {
    customer: true,
    product: true,
    items: { include: { product: true } },
  },
  payments: { order: { include: { customer: true } } },
  deliveries: {
    order: {
      include: { customer: true, items: { include: { product: true } } },
    },
  },
  packing: {
    allocation: {
      include: {
        item: { include: { product: true, order: true } },
        lot: { include: { harvest: { include: { batch: true } } } },
      },
    },
  },
};
async function move(
  tx: any,
  lot: any,
  delta: { onHandDelta: number; reservedDelta: number; packedDelta: number },
  kind: string,
  reference: string,
  actorId: string,
) {
  const after = {
    onHandGrams: lot.onHandGrams + delta.onHandDelta,
    reservedGrams: lot.reservedGrams + delta.reservedDelta,
    packedGrams: lot.packedGrams + delta.packedDelta,
  };
  assert(
    after.onHandGrams >= 0 &&
      after.reservedGrams >= 0 &&
      after.packedGrams >= 0 &&
      after.reservedGrams + after.packedGrams <= after.onHandGrams,
    "Insufficient stock",
  );
  await tx.inventoryLot.update({ where: { id: lot.id }, data: after });
  await tx.stockMovement.create({
    data: { lotId: lot.id, ...delta, kind, reference, actorId },
  });
}
async function orderTransition(tx: any, id: string, status: string, a: Actor) {
  const o = await tx.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  try {
    transition(orderSteps, o.status, status);
  } catch (e: any) {
    throw new HttpException(e.message, 400);
  }
  if (
    status === "CONFIRMED" ||
    (status === "ALLOCATED" && o.status === "CONFIRMED")
  ) {
    // Reservations are made on confirmation. Allocation confirms the fulfillment stage.
    if (status === "CONFIRMED")
      for (const item of o.items) {
        let remaining = item.quantity * item.packGrams;
        const lots = await tx.inventoryLot.findMany({
          where: {
            harvest: { productId: item.productId },
            OR: [{ bestBefore: null }, { bestBefore: { gte: o.deliveryAt } }],
          },
          orderBy: [
            { bestBefore: { sort: "asc", nulls: "last" } },
            { id: "asc" },
          ],
        });
        for (const lot of lots) {
          const available =
            lot.onHandGrams - lot.reservedGrams - lot.packedGrams;
          const grams = Math.min(
            remaining,
            Math.floor(available / item.packGrams) * item.packGrams,
          );
          if (grams <= 0) continue;
          await move(
            tx,
            lot,
            { onHandDelta: 0, reservedDelta: grams, packedDelta: 0 },
            "RESERVE",
            id,
            a.id,
          );
          await tx.allocation.create({
            data: { itemId: item.id, lotId: lot.id, grams },
          });
          remaining -= grams;
          if (!remaining) break;
        }
        assert(
          remaining === 0,
          `Not enough packable ${item.product.name} stock for delivery date. Keep the order as draft until harvested.`,
        );
      }
  }
  if (status === "PACKED")
    for (const item of o.items)
      for (const al of item.allocations) {
        const lot = await tx.inventoryLot.findUniqueOrThrow({
          where: { id: al.lotId },
        });
        assert(
          !lot.bestBefore || lot.bestBefore >= o.deliveryAt,
          "Inventory expires before delivery",
        );
        await move(
          tx,
          lot,
          { onHandDelta: 0, reservedDelta: -al.grams, packedDelta: al.grams },
          "PACK",
          id,
          a.id,
        );
        await tx.packingBatch.create({
          data: {
            allocationId: al.id,
            packs: al.grams / item.packGrams,
            packGrams: item.packGrams,
            packedBy: a.id,
            bestBefore: lot.bestBefore,
          },
        });
      }
  if (status === "CANCELLED")
    for (const item of o.items)
      for (const al of item.allocations) {
        const lot = await tx.inventoryLot.findUniqueOrThrow({
          where: { id: al.lotId },
        });
        await move(
          tx,
          lot,
          {
            onHandDelta: 0,
            reservedDelta: al.packing ? 0 : -al.grams,
            packedDelta: al.packing ? -al.grams : 0,
          },
          "RELEASE",
          id,
          a.id,
        );
        if (al.packing)
          await tx.packingBatch.update({
            where: { id: al.packing.id },
            data: { status: "CANCELLED" },
          });
      }
  if (status === "OUT_FOR_DELIVERY") {
    const d = await tx.delivery.findUnique({ where: { orderId: id } });
    assert(d?.driverId, "Assign a driver before dispatch");
    for (const item of o.items)
      for (const al of item.allocations) {
        assert(
          !al.lot.bestBefore || al.lot.bestBefore >= new Date(),
          "Packed stock is expired",
        );
      }
    await tx.delivery.update({
      where: { orderId: id },
      data: { status: "OUT_FOR_DELIVERY" },
    });
  }
  if (status === "DELIVERED") {
    for (const item of o.items)
      for (const al of item.allocations) {
        const lot = await tx.inventoryLot.findUniqueOrThrow({
          where: { id: al.lotId },
        });
        await move(
          tx,
          lot,
          { onHandDelta: -al.grams, reservedDelta: 0, packedDelta: -al.grams },
          "DELIVER",
          id,
          a.id,
        );
      }
    await tx.delivery.update({
      where: { orderId: id },
      data: { status: "DELIVERED" },
    });
  }
  if (status === "CONFIRMED")
    await tx.delivery.create({
      data: {
        orderId: id,
        address: o.customer.deliveryAddress,
        area: o.customer.area,
        deliveryAt: o.deliveryAt,
      },
    });
  if (status === "CANCELLED" && o.delivery)
    await tx.delivery.update({
      where: { orderId: id },
      data: { status: "CANCELLED" },
    });
  const result = await tx.order.update({ where: { id }, data: { status } });
  await audit(
    tx,
    a,
    "STATUS_CHANGED",
    "orders",
    id,
    { status: o.status },
    { status },
  );
  return result;
}
async function generateSchedules(through: Date, actor: Actor) {
  const now = new Date();
  const v = { through };
  return transact(async (tx) => {
    const schedules = await tx.schedule.findMany({
      where: { status: "ACTIVE" },
      include: { customer: true, items: { include: { product: true } } },
    });
    let created = 0;
    for (const s of schedules) {
      if (!s.customer.active || s.items.some((i) => !i.product.active))
        continue;
      for (const key of occurrences(s, now, v.through)) {
        const existing = await tx.order.findUnique({
          where: {
            scheduleId_occurrenceDate: {
              scheduleId: s.id,
              occurrenceDate: key,
            },
          },
        });
        if (existing) continue;
        const items = s.items.length
          ? s.items.map((i) => ({
              productId: i.productId,
              packGrams: i.packGrams,
              quantity: i.quantity,
              unitPricePaise: i.unitPricePaise,
            }))
          : [
              {
                productId: s.productId,
                packGrams: s.packGrams,
                quantity: s.quantity,
                unitPricePaise: s.unitPricePaise,
              },
            ];
        const o = await tx.order.create({
          data: {
            number: "KG-" + randomUUID().slice(0, 8).toUpperCase(),
            customerId: s.customerId,
            scheduleId: s.id,
            occurrenceDate: key,
            deliveryAt: new Date(key + "T12:00:00+05:30"),
            ...totals(items, 0, 0),
            items: { create: items },
            notes: `Generated from ${s.name}`,
          },
        });
        await audit(tx, actor, "GENERATED", "orders", o.id, undefined, {
          scheduleId: s.id,
          date: key,
        });
        created++;
      }
    }
    return { created };
  });
}
@ApiTags("Operations")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api")
class Operations {
  @Get("me") me(@Req() r: R) {
    return r.actor;
  }
  @Post("account/password") async changePassword(
    @Req() r: R,
    @Body() b: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const v = z
      .object({
        currentPassword: z.string().min(1).max(128),
        newPassword: z.string().min(12).max(128),
      })
      .strict()
      .parse(b);
    const u = await db.user.findUniqueOrThrow({ where: { id: r.actor.id } });
    if (!(await compare(v.currentPassword, u.passwordHash)))
      throw new HttpException("Current password is incorrect", 400);
    assert(v.currentPassword !== v.newPassword, "Choose a different password");
    const passwordHash = await hash(v.newPassword, 12);
    await transact(async (tx) => {
      await tx.user.update({ where: { id: u.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: u.id } });
      await audit(tx, r.actor, "PASSWORD_CHANGED", "users", u.id);
    });
    return session(u, res);
  }
  @Get("delivery-drivers") async drivers(@Req() r: R) {
    permit(r.actor, "deliveries");
    assertRole(r.actor.role !== "DELIVERY");
    return {
      data: await db.user.findMany({
        where: { role: "DELIVERY", active: true },
        select: { id: true, name: true },
      }),
    };
  }
  @Get("packing/:id/label") async packingLabel(
    @Req() r: R,
    @Param("id") id: string,
  ) {
    permit(r.actor, "packing");
    const p = await db.packingBatch.findUniqueOrThrow({ where: { id } });
    assert(p.status !== "CANCELLED", "Cancelled packing cannot be labelled");
    const record = await new PublicController().trace(p.publicToken);
    const traceUrl = publicOrigin() + "/api/public/package/" + p.publicToken;
    return {
      ...record,
      traceUrl,
      packGrams: p.packGrams,
      packs: p.packs,
      qrDataUrl: await QRCode.toDataURL(traceUrl, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: "M",
      }),
    };
  }
  @Get("history/:resource/:id") async history(
    @Req() r: R,
    @Param("resource") resource: string,
    @Param("id") id: string,
  ) {
    assert(
      ["orders", "batches"].includes(resource),
      "No history for this resource",
    );
    permit(r.actor, resource);
    const history = await db.auditLog.findMany({
      where: { entity: resource, entityId: id },
      orderBy: { createdAt: "asc" },
    });
    const people = await db.user.findMany({
      where: { id: { in: [...new Set(history.map((h) => h.actorId))] } },
      select: { id: true, name: true },
    });
    return history.map((h) => ({
      ...h,
      actorName:
        people.find((p) => p.id === h.actorId)?.name || "Scheduled operation",
    }));
  }
  @Get("settings") async settings() {
    return Object.fromEntries(
      (await db.setting.findMany()).map((s) => [s.key, s.value]),
    );
  }
  @Patch("settings") async settingsUpdate(@Req() r: R, @Body() b: unknown) {
    permit(r.actor, "settings", true);
    const v = z
      .object({
        businessName: z.string().min(1).max(120),
        farmAddress: z.string().max(500),
      })
      .strict()
      .parse(b);
    return transact(async (tx) => {
      for (const [key, value] of Object.entries(v))
        await tx.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      await audit(tx, r.actor, "UPDATED", "settings", "business", undefined, v);
      return v;
    });
  }
  @Get("dashboard") async dashboard(@Req() r: R) {
    permit(r.actor, "dashboard");
    const today = dayKey(new Date());
    const start = new Date(today + "T00:00:00+05:30"),
      end = new Date(start.getTime() + 86400000),
      week = new Date(start.getTime() + 7 * 86400000),
      month = new Date(today.slice(0, 7) + "-01T00:00:00+05:30");
    const [orders, batches, stock, payments, schedules, expenses, products] =
      await Promise.all([
        db.order.findMany({
          where: { status: { not: "CANCELLED" } },
          include: {
            customer: true,
            payments: true,
            items: { include: { product: true } },
          },
        }),
        db.growingBatch.findMany({
          where: { status: { notIn: ["CANCELLED", "FAILED", "HARVESTED"] } },
          include: { product: true },
        }),
        db.inventoryLot.findMany({
          include: { harvest: { include: { product: true } } },
        }),
        db.payment.findMany(),
        db.schedule.findMany({
          where: { status: "ACTIVE" },
          include: { customer: true, product: true },
        }),
        db.expense.findMany(),
        db.product.findMany({ where: { active: true } }),
      ]);
    const net = (p: any) =>
      p.kind === "REFUND" ? -p.amountPaise : p.amountPaise;
    const revenue = payments
      .filter((p) => p.paidAt >= month)
      .reduce((s, p) => s + net(p), 0);
    return {
      today,
      lowInventory: products
        .map((p) => ({
          product: p.name,
          availableGrams: stock
            .filter(
              (l) =>
                l.harvest.productId === p.id &&
                (!l.bestBefore || l.bestBefore >= new Date()),
            )
            .reduce(
              (sum, l) => sum + l.onHandGrams - l.reservedGrams - l.packedGrams,
              0,
            ),
          thresholdGrams: p.lowStockGrams,
        }))
        .filter((p) => p.availableGrams <= p.thresholdGrams),
      overdueBatches: batches.filter((b) => b.harvestDueAt < start),
      upcomingSchools: orders.filter(
        (o) =>
          o.customer.type === "SCHOOL" &&
          o.deliveryAt >= start &&
          o.deliveryAt < week &&
          o.status !== "DELIVERED",
      ),
      upcomingSubscriptions: orders.filter(
        (o) =>
          o.scheduleId &&
          o.deliveryAt >= start &&
          o.deliveryAt < week &&
          o.status !== "DELIVERED",
      ),
      todayOrders: orders.filter(
        (o) => o.createdAt >= start && o.createdAt < end,
      ).length,
      todayDeliveries: orders.filter(
        (o) => o.deliveryAt >= start && o.deliveryAt < end,
      ).length,
      todayRevenue: payments
        .filter((p) => p.paidAt >= start && p.paidAt < end)
        .reduce((s, p) => s + net(p), 0),
      monthlyRevenue: revenue,
      pendingPayments: orders.reduce(
        (s, o) =>
          s +
          Math.max(
            0,
            (o.status === "DRAFT" ? 0 : o.totalPaise) -
              o.payments.reduce((t, p) => t + net(p), 0),
          ),
        0,
      ),
      activeBatches: batches.length,
      harvestToday: batches.filter(
        (b) => b.harvestDueAt >= start && b.harvestDueAt < end,
      ).length,
      harvestWeek: batches.filter(
        (b) => b.harvestDueAt >= start && b.harvestDueAt < week,
      ).length,
      orders: orders.filter(
        (o) => o.deliveryAt >= start && o.deliveryAt < week,
      ),
      batches,
      stock,
      schedules,
      monthly: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today.slice(0, 7) + "-01T12:00:00Z");
        d.setUTCMonth(d.getUTCMonth() - 5 + i);
        const key = dayKey(d).slice(0, 7);
        return {
          month: d.toLocaleString("en-IN", {
            month: "short",
            timeZone: "Asia/Kolkata",
          }),
          revenue: payments
            .filter((p) => dayKey(p.paidAt).startsWith(key))
            .reduce((s, p) => s + net(p) / 100, 0),
        };
      }),
      customerTypes: Object.entries(
        orders.reduce((a: any, o) => {
          a[o.customer.type] = (a[o.customer.type] || 0) + 1;
          return a;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
      expenses: expenses
        .filter((e) => e.incurredAt >= month)
        .reduce((s, e) => s + e.amountPaise, 0),
    };
  }
  @Get("planning") async planning(
    @Req() r: R,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    permit(r.actor, "planning");
    const begin = from ? z.coerce.date().parse(from) : new Date();
    const until = to
      ? z.coerce.date().parse(to)
      : new Date(begin.getTime() + 7 * 86400000);
    assert(
      until >= begin && until.getTime() - begin.getTime() <= 90 * 86400000,
      "Choose a range of 0 to 90 days",
    );
    const [products, orders, schedules, lots, batches] = await Promise.all([
      db.product.findMany({ where: { active: true } }),
      db.order.findMany({
        where: {
          deliveryAt: { gte: begin, lte: until },
          status: { in: ["DRAFT"] },
        },
        include: { items: true },
      }),
      db.schedule.findMany({
        where: { status: "ACTIVE" },
        include: {
          orders: { select: { occurrenceDate: true } },
          items: true,
          customer: true,
        },
      }),
      db.inventoryLot.findMany({ include: { harvest: true } }),
      db.growingBatch.findMany({
        where: {
          status: {
            in: ["SOWN", "GERMINATING", "GROWING", "READY_TO_HARVEST"],
          },
          harvestDueAt: { lte: until },
        },
      }),
    ]);
    return products.map((p) => {
      const demand: { date: Date; grams: number }[] = orders.flatMap((o) =>
        o.items
          .filter((i) => i.productId === p.id)
          .map((i) => ({
            date: o.deliveryAt,
            grams: i.quantity * i.packGrams,
          })),
      );
      for (const s of schedules.filter((s) => s.customer.active)) {
        const items = s.items.length
          ? s.items
          : [
              {
                productId: s.productId,
                packGrams: s.packGrams,
                quantity: s.quantity,
              },
            ];
        const grams = items
          .filter((i) => i.productId === p.id)
          .reduce((sum, i) => sum + i.quantity * i.packGrams, 0);
        if (!grams) continue;
        for (const key of occurrences(s, begin, until))
          if (!s.orders.some((o) => o.occurrenceDate === key))
            demand.push({ date: new Date(key + "T12:00:00+05:30"), grams });
      }
      demand.sort((a, b) => +a.date - +b.date);
      const supply = [
        ...lots
          .filter((l) => l.harvest.productId === p.id)
          .map((l) => ({
            date: begin,
            expiry: l.bestBefore,
            grams: l.onHandGrams - l.reservedGrams - l.packedGrams,
          })),
        ...batches
          .filter((b) => b.productId === p.id)
          .map((b) => ({
            date: b.harvestDueAt,
            expiry: null,
            grams: b.expectedGrams,
          })),
      ];
      let shortage = 0;
      let first: Date | null = null;
      for (const d of demand) {
        let need = d.grams;
        for (const s of supply
          .filter((s) => s.date <= d.date && (!s.expiry || s.expiry >= d.date))
          .sort(
            (a, b) =>
              (a.expiry?.getTime() ?? Infinity) -
              (b.expiry?.getTime() ?? Infinity),
          )) {
          const use = Math.min(s.grams, need);
          s.grams -= use;
          need -= use;
        }
        if (need && !first) first = d.date;
        shortage += need;
      }
      return {
        product: p,
        demandGrams: demand.reduce((s, d) => s + d.grams, 0),
        stockGrams: lots
          .filter(
            (l) =>
              l.harvest.productId === p.id &&
              (!l.bestBefore || l.bestBefore >= begin),
          )
          .reduce(
            (s, l) => s + l.onHandGrams - l.reservedGrams - l.packedGrams,
            0,
          ),
        growingGrams: batches
          .filter((b) => b.productId === p.id)
          .reduce((s, b) => s + b.expectedGrams, 0),
        shortageGrams: shortage,
        additionalTrays: Math.ceil(shortage / p.yieldGramsPerTray),
        plantBy: first
          ? new Date(first.getTime() - p.growingDays * 86400000)
          : null,
      };
    });
  }
  @Get("traceability/:id") async trace(@Req() r: R, @Param("id") id: string) {
    permit(r.actor, "traceability");
    const order = await db.order.findFirst({
      where: { OR: [{ id }, { number: id }] },
      include: orderInclude,
    });
    if (order) return { type: "order", record: order };
    const batch = await db.growingBatch.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        product: true,
        seedLot: { include: { supplier: true } },
        harvests: {
          include: {
            inventory: {
              include: {
                allocations: {
                  include: {
                    packing: true,
                    item: {
                      include: { order: { include: { customer: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!batch) throw new HttpException("Order or batch not found", 404);
    return { type: "batch", record: batch };
  }
  @Get("billing") async billing(@Req() r: R, @Query("month") month: string) {
    permit(r.actor, "payments");
    assert(/^\d{4}-\d{2}$/.test(month), "Use YYYY-MM");
    const from = new Date(month + "-01T00:00:00+05:30");
    assert(!isNaN(+from), "Invalid month");
    const next = new Date(month + "-01T12:00:00Z");
    next.setUTCMonth(next.getUTCMonth() + 1);
    const to = new Date(next.toISOString().slice(0, 7) + "-01T00:00:00+05:30");
    const orders = await db.order.findMany({
      where: {
        deliveryAt: { gte: from, lt: to },
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      include: { customer: true, payments: true },
    });
    const groups = new Map<string, any>();
    for (const o of orders) {
      let g = groups.get(o.customerId);
      if (!g) {
        g = {
          customer: o.customer,
          orders: [],
          invoiceAmountPaise: 0,
          amountPaidPaise: 0,
          outstandingPaise: 0,
        };
        groups.set(o.customerId, g);
      }
      const paid = o.payments.reduce(
        (s, p) => s + (p.kind === "REFUND" ? -1 : 1) * p.amountPaise,
        0,
      );
      g.orders.push({
        id: o.id,
        number: o.number,
        deliveryAt: o.deliveryAt,
        totalPaise: o.totalPaise,
        paidPaise: paid,
      });
      g.invoiceAmountPaise += o.totalPaise;
      g.amountPaidPaise += paid;
      g.outstandingPaise += Math.max(0, o.totalPaise - paid);
    }
    return { month, statements: [...groups.values()] };
  }
  @Get("reports") async reports(
    @Req() r: R,
    @Query("from") f: string,
    @Query("to") t: string,
  ) {
    permit(r.actor, "reports");
    const from = z.coerce.date().parse(f),
      to = z.coerce.date().parse(t);
    assert(
      to >= from && +to - +from <= 366 * 86400000,
      "Choose a range up to 366 days",
    );
    const [orders, harvests, expenses, payments] = await Promise.all([
      db.order.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          status: { notIn: ["DRAFT", "CANCELLED"] },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: {
                  lot: {
                    include: {
                      harvest: {
                        include: {
                          batch: { include: { seedLot: true, expenses: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          payments: true,
          schedule: true,
        },
      }),
      db.harvest.findMany({
        where: { harvestedAt: { gte: from, lte: to } },
        include: {
          batch: { include: { seedLot: true, expenses: true } },
          product: true,
        },
      }),
      db.expense.findMany({ where: { incurredAt: { gte: from, lte: to } } }),
      db.payment.findMany({ where: { paidAt: { gte: from, lte: to } } }),
    ]);
    const grouped = (key: (o: (typeof orders)[number]) => string) =>
      Object.values(
        orders.reduce(
          (
            acc: Record<
              string,
              {
                name: string;
                orders: number;
                salesPaise: number;
                outstandingPaise: number;
              }
            >,
            o,
          ) => {
            const name = key(o);
            const r = (acc[name] ||= {
              name,
              orders: 0,
              salesPaise: 0,
              outstandingPaise: 0,
            });
            r.orders++;
            r.salesPaise += o.totalPaise;
            r.outstandingPaise += Math.max(
              0,
              o.totalPaise -
                o.payments.reduce(
                  (s, p) => s + (p.kind === "REFUND" ? -1 : 1) * p.amountPaise,
                  0,
                ),
            );
            return acc;
          },
          {},
        ),
      );
    const batchCost = (b: any) =>
      Math.round(
        (b.seedGrams * b.seedLot.costPaise) / b.seedLot.purchasedGrams,
      ) + b.expenses.reduce((sum: number, e: any) => sum + e.amountPaise, 0);
    const costRows = harvests.map((h) => ({
      batch: h.batch.code,
      product: h.product.name,
      usableGrams: h.usableGrams,
      seedCostPaise: Math.round(
        (h.batch.seedGrams * h.batch.seedLot.costPaise) /
          h.batch.seedLot.purchasedGrams,
      ),
      allocatedExpensesPaise: h.batch.expenses.reduce(
        (sum, e) => sum + e.amountPaise,
        0,
      ),
      totalCostPaise: batchCost(h.batch),
      costPaisePerKg: h.usableGrams
        ? Math.round((batchCost(h.batch) * 1000) / h.usableGrams)
        : null,
    }));
    const delivered = orders.filter((o) => o.status === "DELIVERED");
    const deliveredNetSalesPaise = delivered.reduce(
      (sum, o) => sum + o.subtotalPaise - o.discountPaise,
      0,
    );
    const deliveredCostPaise = Math.round(
      delivered.reduce(
        (sum, o) =>
          sum +
          o.items.reduce(
            (subtotal, i) =>
              subtotal +
              i.allocations.reduce(
                (cost, a) =>
                  cost +
                  (a.lot.harvest.usableGrams
                    ? (batchCost(a.lot.harvest.batch) * a.grams) /
                      a.lot.harvest.usableGrams
                    : 0),
                0,
              ),
            0,
          ),
        0,
      ),
    );
    return {
      orders,
      byCustomer: grouped((o) => o.customer.name).sort(
        (a, b) => b.salesPaise - a.salesPaise,
      ),
      byCustomerType: grouped((o) => o.customer.type),
      byDay: grouped((o) => dayKey(o.createdAt)).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      bySource: grouped((o) => o.schedule?.kind || "DIRECT"),
      costRows,
      deliveredNetSalesPaise,
      deliveredCostPaise,
      estimatedGrossProfitPaise: deliveredNetSalesPaise - deliveredCostPaise,
      harvests,
      expenses,
      payments,
      salesPaise: orders.reduce((s, o) => s + o.totalPaise, 0),
      cashCollectedPaise: payments.reduce(
        (s, p) => s + (p.kind === "REFUND" ? -1 : 1) * p.amountPaise,
        0,
      ),
      expensesPaise: expenses.reduce((s, e) => s + e.amountPaise, 0),
    };
  }
  @Get(":resource") async list(
    @Req() r: R,
    @Param("resource") resource: string,
    @Query("page") page = "1",
    @Query("limit") limit = "200",
    @Query("q") query = "",
    @Query("status") status = "",
    @Query("kind") kind = "",
  ) {
    permit(r.actor, resource);
    assert(model[resource], "Unknown resource");
    const p = z.coerce.number().int().min(1).parse(page),
      take = z.coerce.number().int().min(1).max(500).parse(limit);
    const where: any =
      resource === "deliveries" && r.actor.role === "DELIVERY"
        ? { driverId: r.actor.id }
        : {};
    const needle = z.string().max(150).parse(query).trim();
    const searchable: Record<string, string[]> = {
      products: ["name", "variety"],
      suppliers: ["name", "contact", "phone"],
      "seed-lots": ["lotNumber", "product.name", "supplier.name"],
      batches: ["code", "product.name"],
      harvests: ["batch.code", "product.name"],
      inventory: ["harvest.batch.code", "harvest.product.name"],
      customers: ["name", "contact", "phone", "area"],
      orders: ["number", "customer.name", "customer.area"],
      schedules: ["name", "customer.name", "items.product.name"],
      payments: ["reference", "order.number", "order.customer.name"],
      expenses: ["description", "category"],
      deliveries: ["order.number", "order.customer.name", "area", "route"],
      packing: ["allocation.item.order.number", "allocation.item.product.name"],
      audit: ["action", "entity", "entityId"],
      movements: ["kind", "reference"],
      users: ["name", "username", "role"],
    };
    if (needle)
      where.OR = ["id", ...(searchable[resource] || [])].map((path) => {
        const parts = path.split(".");
        let value: any = { contains: needle, mode: "insensitive" };
        for (let i = parts.length - 1; i >= 0; i--)
          value =
            parts[i] === "items"
              ? { items: { some: value } }
              : { [parts[i]]: value };
        return value;
      });
    if (status && status !== "all") {
      const value = z.string().max(40).parse(status);
      if (resource === "customers") where.type = value;
      else if (
        ["orders", "batches", "schedules", "deliveries", "packing"].includes(
          resource,
        )
      )
        where.status = value;
    }
    if (resource === "schedules" && kind)
      where.kind = z.enum(["SCHOOL", "SUBSCRIPTION"]).parse(kind);
    const orderBy =
      resource === "inventory"
        ? { harvest: { harvestedAt: "desc" } }
        : resource === "packing"
          ? { packedAt: "desc" }
          : resource === "deliveries"
            ? { deliveryAt: "desc" }
            : { createdAt: "desc" };
    const args: any = {
      where,
      take,
      skip: (p - 1) * take,
      orderBy: [orderBy, { id: "desc" }],
    };
    if (resource === "users")
      args.select = {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
      };
    else if (includes[resource]) args.include = includes[resource];
    const [data, total] = await Promise.all([
      (db as any)[model[resource]].findMany(args),
      (db as any)[model[resource]].count({ where }),
    ]);
    if (resource === "orders")
      for (const o of data) {
        o.paidPaise = o.payments.reduce(
          (s: number, p: any) =>
            s + (p.kind === "REFUND" ? -1 : 1) * p.amountPaise,
          0,
        );
        o.paymentStatus = paymentStatus(
          o.totalPaise,
          o.paidPaise,
          o.payments.some((p: any) => p.kind === "REFUND"),
        );
      }
    return { data, total, page: p, limit: take };
  }
  @Post("schedules/generate") async generate(
    @Req() r: R,
    @Body() body: unknown,
  ) {
    permit(r.actor, "schedules", true);
    const v = z.object({ through: z.coerce.date() }).strict().parse(body);
    const now = new Date();
    assert(
      v.through >= now && +v.through - +now <= 90 * 86400000,
      "Generate up to 90 days ahead",
    );
    return generateSchedules(v.through, r.actor);
  }
  @Post("inventory/:id/discard") async discard(
    @Req() r: R,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    permit(r.actor, "inventory", true);
    const v = z
      .object({
        grams: z.number().int().positive(),
        reason: z.string().min(3).max(500),
      })
      .strict()
      .parse(body);
    return transact(async (tx) => {
      const lot = await tx.inventoryLot.findUniqueOrThrow({ where: { id } });
      await move(
        tx,
        lot,
        { onHandDelta: -v.grams, reservedDelta: 0, packedDelta: 0 },
        "DISCARD",
        v.reason,
        r.actor.id,
      );
      await audit(tx, r.actor, "DISCARDED", "inventory", id, undefined, v);
      return { ok: true };
    });
  }
  @Post(":resource") async create(
    @Req() r: R,
    @Param("resource") resource: string,
    @Body() body: unknown,
  ) {
    permit(r.actor, resource, true);
    if (resource === "orders")
      assertRole(["OWNER", "ADMIN", "SALES"].includes(r.actor.role));
    const schema = (schemas as any)[resource];
    assert(schema, "This resource cannot be created directly");
    const v = schema.parse(body);
    return transact(async (tx) => {
      let data: any = v;
      let result: any;
      if (resource === "products") {
        const { formats, ...rest } = v;
        data = { ...rest, formats: { create: formats } };
      }
      if (resource === "seed-lots")
        data = { ...v, remainingGrams: v.purchasedGrams };
      if (resource === "batches") {
        const p = await tx.product.findUniqueOrThrow({
          where: { id: v.productId },
        });
        const seed = await tx.seedLot.findUniqueOrThrow({
          where: { id: v.seedLotId },
        });
        assert(seed.productId === p.id, "Seed lot belongs to another variety");
        assert(p.active, "Product is inactive");
        assert(
          p.yieldGramsPerTray * v.trays <= 2147483647,
          "Expected harvest exceeds supported range",
        );
        data = {
          ...v,
          code:
            p.name.slice(0, 3).toUpperCase() +
            "-" +
            dayKey(v.sownAt).replaceAll("-", "") +
            "-" +
            randomUUID().slice(0, 6).toUpperCase(),
          expectedGrams: p.yieldGramsPerTray * v.trays,
        };
      }
      if (resource === "orders") {
        const c = await tx.customer.findUniqueOrThrow({
          where: { id: v.customerId },
        });
        assert(c.active, "Customer is inactive");
        for (const i of v.items) {
          const p = await tx.product.findUniqueOrThrow({
            where: { id: i.productId },
            include: { formats: true },
          });
          assert(
            p.active && p.formats.some((f) => f.grams === i.packGrams),
            "Choose an active product and configured pack size",
          );
        }
        const { items, ...rest } = v;
        data = {
          ...rest,
          number: "KG-" + randomUUID().slice(0, 8).toUpperCase(),
          ...totals(items, v.discountPaise, v.taxPaise),
          items: { create: items },
        };
      }
      if (resource === "schedules") {
        const c = await tx.customer.findUniqueOrThrow({
          where: { id: v.customerId },
        });
        assert(c.active, "Customer is inactive");
        assert(
          v.kind !== "SCHOOL" || c.type === "SCHOOL",
          "School programs require a school customer",
        );
        const items = v.items || [
          {
            productId: v.productId,
            packGrams: v.packGrams,
            quantity: v.quantity,
            unitPricePaise: v.unitPricePaise,
          },
        ];
        totals(items, 0, 0);
        for (const item of items) {
          const p = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
            include: { formats: true },
          });
          assert(
            p.active && p.formats.some((f) => f.grams === item.packGrams),
            "Choose active products and configured pack sizes",
          );
        }
        const { items: inputItems, ...rest } = v;
        data = { ...rest, ...items[0], items: { create: items } };
      }
      if (resource === "harvests") {
        const { bestBefore, ...rest } = v;
        const b = await tx.growingBatch.findUniqueOrThrow({
          where: { id: v.batchId },
        });
        assert(
          b.status === "READY_TO_HARVEST",
          "Batch must be ready to harvest",
        );
        assert(
          v.harvestedAt >= b.sownAt && v.harvestedAt <= new Date(),
          "Harvest date must be after sowing and not in the future",
        );
        data = {
          ...rest,
          productId: b.productId,
          rejectedGrams: v.harvestedGrams - v.usableGrams,
          employeeId: r.actor.id,
        };
        result = await tx.harvest.create({ data });
        const lot = await tx.inventoryLot.create({
          data: { harvestId: result.id, onHandGrams: 0, bestBefore },
        });
        await move(
          tx,
          lot,
          { onHandDelta: v.usableGrams, reservedDelta: 0, packedDelta: 0 },
          "HARVEST",
          result.id,
          r.actor.id,
        );
        await tx.growingBatch.update({
          where: { id: b.id },
          data: { status: "HARVESTED" },
        });
        await audit(
          tx,
          r.actor,
          "STATUS_CHANGED",
          "batches",
          b.id,
          { status: b.status },
          { status: "HARVESTED" },
        );
      }
      if (resource === "payments") {
        assert(v.paidAt <= new Date(), "Payment date cannot be in the future");
        const exists = await tx.payment.findUnique({
          where: { requestKey: v.requestKey },
        });
        if (exists) {
          assert(
            exists.orderId === v.orderId &&
              exists.amountPaise === v.amountPaise &&
              exists.kind === v.kind,
            "Idempotency key was used with a different payment",
          );
          return exists;
        }
        const o = await tx.order.findUniqueOrThrow({
          where: { id: v.orderId },
          include: { payments: true },
        });
        assert(
          v.kind === "REFUND" || !["DRAFT", "CANCELLED"].includes(o.status),
          "Confirm the order before recording payment",
        );
        const paid = o.payments.reduce(
          (s, p) => s + (p.kind === "REFUND" ? -1 : 1) * p.amountPaise,
          0,
        );
        assert(
          v.kind === "REFUND"
            ? v.amountPaise <= paid
            : v.amountPaise <= o.totalPaise - paid,
          "Amount exceeds the available balance",
        );
        data = { ...v, actorId: r.actor.id };
      }
      if (resource === "expenses") {
        assert(
          !(v.batchId && v.category === "SEEDS"),
          "Seed cost is already allocated from seed usage; record seed purchases without a batch",
        );
        data = { ...v, actorId: r.actor.id };
      }
      if (resource === "users") {
        assertRole(r.actor.role === "OWNER");
        const { password, ...rest } = v;
        data = { ...rest, passwordHash: await hash(password, 12) };
      }
      if (!result) result = await (tx as any)[model[resource]].create({ data });
      const { passwordHash, ...safe } = result;
      await audit(tx, r.actor, "CREATED", resource, result.id, undefined, safe);
      return safe;
    });
  }
  @Patch(":resource/:id") async update(
    @Req() r: R,
    @Param("resource") resource: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    permit(r.actor, resource, true);
    return transact(async (tx) => {
      if (resource === "orders") {
        const v = z.object({ status: z.string() }).strict().parse(body);
        if (["PRODUCTION_MANAGER", "FARM_WORKER"].includes(r.actor.role))
          assertRole(["ALLOCATED", "PACKING", "PACKED"].includes(v.status));
        return orderTransition(tx, id, v.status, r.actor);
      }
      if (resource === "batches") {
        const v = z.object({ status: z.string() }).strict().parse(body);
        const b = await tx.growingBatch.findUniqueOrThrow({ where: { id } });
        try {
          transition(batchSteps, b.status, v.status);
        } catch (e: any) {
          throw new HttpException(e.message, 400);
        }
        if (v.status === "SOWN") {
          const seed = await tx.seedLot.findUniqueOrThrow({
            where: { id: b.seedLotId },
          });
          assert(
            seed.expiresAt >= b.sownAt && seed.remainingGrams >= b.seedGrams,
            "Seed lot is expired or has insufficient stock",
          );
          await tx.seedLot.update({
            where: { id: seed.id },
            data: { remainingGrams: { decrement: b.seedGrams } },
          });
          await audit(
            tx,
            r.actor,
            "SEED_CONSUMED",
            "seed-lots",
            seed.id,
            { remainingGrams: seed.remainingGrams },
            { remainingGrams: seed.remainingGrams - b.seedGrams, batchId: id },
          );
        }
        const result = await tx.growingBatch.update({ where: { id }, data: v });
        await audit(
          tx,
          r.actor,
          "STATUS_CHANGED",
          resource,
          id,
          { status: b.status },
          v,
        );
        return result;
      }
      if (resource === "deliveries") {
        const v = z
          .object({
            status: z
              .enum([
                "ASSIGNED",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "FAILED",
                "RESCHEDULED",
              ])
              .optional(),
            driverId: z.string().uuid().optional(),
            vehicle: z.string().max(100).optional(),
            route: z.string().max(100).optional(),
            timeSlot: z.string().max(100).optional(),
            deliveryAt: z.coerce.date().optional(),
            notes: z.string().max(1000).optional(),
          })
          .strict()
          .parse(body);
        const d = await tx.delivery.findUniqueOrThrow({ where: { id } });
        if (r.actor.role === "DELIVERY") {
          assertRole(
            d.driverId === r.actor.id &&
              !v.driverId &&
              !v.vehicle &&
              !v.route &&
              !v.timeSlot &&
              !v.deliveryAt,
          );
          assertRole(!v.status || ["DELIVERED", "FAILED"].includes(v.status));
        }
        assert(
          !["DELIVERED", "CANCELLED"].includes(d.status),
          "Delivery is already closed",
        );
        if (v.driverId) {
          const u = await tx.user.findUniqueOrThrow({
            where: { id: v.driverId },
          });
          assert(
            u.active && u.role === "DELIVERY",
            "Choose an active delivery user",
          );
        }
        if (v.status === "ASSIGNED") {
          assert(
            ["PENDING", "ASSIGNED", "RESCHEDULED"].includes(d.status),
            "Cannot reassign a dispatched delivery",
          );
          assert(v.driverId || d.driverId, "Choose a driver");
        }
        if (v.status === "FAILED")
          assert(
            d.status === "OUT_FOR_DELIVERY",
            "Only dispatched deliveries may fail",
          );
        if (v.status === "DELIVERED")
          assert(
            ["OUT_FOR_DELIVERY", "FAILED"].includes(d.status),
            "Delivery has not been dispatched",
          );
        if (v.status === "RESCHEDULED") {
          assert(
            v.deliveryAt && v.deliveryAt >= new Date(),
            "Choose a future delivery date",
          );
          const o = await tx.order.findUniqueOrThrow({
            where: { id: d.orderId },
            include: orderInclude,
          });
          for (const item of o.items)
            for (const al of item.allocations)
              assert(
                !al.lot.bestBefore || al.lot.bestBefore >= v.deliveryAt,
                "Allocated stock expires before the new delivery date",
              );
          await tx.order.update({
            where: { id: d.orderId },
            data: {
              deliveryAt: v.deliveryAt,
              ...(o.status === "OUT_FOR_DELIVERY" ? { status: "PACKED" } : {}),
            },
          });
        } else
          assert(!v.deliveryAt, "Use reschedule to change the delivery date");
        if (v.status === "OUT_FOR_DELIVERY" || v.status === "DELIVERED")
          await orderTransition(tx, d.orderId, v.status, r.actor);
        const result = await tx.delivery.update({ where: { id }, data: v });
        await audit(tx, r.actor, "UPDATED", resource, id, d, result);
        return result;
      }
      if (resource === "schedules") {
        const v = z
          .object({ status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]) })
          .strict()
          .parse(body);
        const old = await tx.schedule.findUniqueOrThrow({ where: { id } });
        assert(
          old.status !== "CANCELLED",
          "Cancelled schedules cannot restart",
        );
        const result = await tx.schedule.update({ where: { id }, data: v });
        await audit(tx, r.actor, "UPDATED", resource, id, old, result);
        return result;
      }
      if (resource === "users") {
        assertRole(r.actor.role === "OWNER");
        const v = z
          .object({
            role: z.enum(roles).optional(),
            active: z.boolean().optional(),
          })
          .strict()
          .parse(body);
        assert(id !== r.actor.id, "You cannot change your own access");
        const old = await tx.user.findUniqueOrThrow({ where: { id } });
        const result = await tx.user.update({ where: { id }, data: v });
        await tx.session.deleteMany({ where: { userId: id } });
        await audit(
          tx,
          r.actor,
          "ACCESS_CHANGED",
          "users",
          id,
          { role: old.role, active: old.active },
          v,
        );
        return { id: result.id, role: result.role, active: result.active };
      }
      assert(
        ["products", "customers", "suppliers"].includes(resource),
        "This record is immutable; use a compensating transaction",
      );
      const old = await (tx as any)[model[resource]].findUniqueOrThrow({
        where: { id },
      });
      const v = (schemas as any)[resource].parse(body);
      let data = v;
      if (resource === "products") {
        const { formats, ...rest } = v;
        await tx.productFormat.deleteMany({ where: { productId: id } });
        data = { ...rest, formats: { create: formats } };
      }
      const result = await (tx as any)[model[resource]].update({
        where: { id },
        data,
      });
      await audit(tx, r.actor, "UPDATED", resource, id, old, result);
      return result;
    });
  }
}
@Controller("api")
class PublicController {
  @Get("cron/recurrence") async recurringJob(@Req() req: Request) {
    if (
      !process.env.CRON_SECRET ||
      req.headers.authorization !== "Bearer " + process.env.CRON_SECRET
    )
      throw new UnauthorizedException();
    return generateSchedules(new Date(Date.now() + 30 * 86400000), {
      id: "vercel-cron",
      name: "Recurring order scheduler",
      role: "OWNER",
    });
  }
  @Get("health") health() {
    return {
      status: "ok",
      environment:
        process.env.APP_ENV === "training" ? "training" : "production",
    };
  }
  @Get("public/package/:token") async packagePage(
    @Param("token") token: string,
    @Res() res: Response,
  ) {
    return res.type("html").send(tracePage(await this.trace(token)));
  }
  @Get("public/trace/:token") async trace(@Param("token") token: string) {
    z.string().uuid().parse(token);
    const p = await db.packingBatch.findUnique({
      where: { publicToken: token },
      include: {
        allocation: {
          include: {
            item: { include: { product: true } },
            lot: { include: { harvest: { include: { batch: true } } } },
          },
        },
      },
    });
    if (!p || p.status === "CANCELLED")
      throw new HttpException("Package not found", 404);
    const settings = Object.fromEntries(
      (await db.setting.findMany()).map((x) => [x.key, x.value]),
    );
    return {
      product: p.allocation.item.product.name,
      batch: p.allocation.lot.harvest.batch.code,
      harvestedAt: p.allocation.lot.harvest.harvestedAt,
      packedAt: p.packedAt,
      bestBefore: p.bestBefore,
      storageInstructions: p.allocation.item.product.storageInstructions,
      farm: settings.businessName || "Microgreens farm",
      address: settings.farmAddress || "Coimbatore, Tamil Nadu",
    };
  }
}
@Module({
  controllers: [PublicController, AuthController, Operations],
  providers: [AuthGuard],
})
class AppModule {}
export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (
      value: string | undefined,
      callback: (err: Error | null, allowed?: boolean) => void,
    ) => callback(null, !value || allowedOrigins.has(value)),
    credentials: true,
  });
  app.use((req: Request, res: Response, next: () => void) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      !allowedOrigins.has(req.headers.origin)
    )
      return res.status(403).json({ message: "Request origin is not allowed" });
    next();
  });
  app.useGlobalFilters(new Errors());
  const config = new DocumentBuilder()
    .setTitle("Kovai Greens Operations API")
    .setDescription(
      "Weights: integer grams. Money: integer paise. Business dates: Asia/Kolkata. See README for validated request contracts.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ||= {};
  document.components.schemas ||= {};
  for (const [resource, schema] of Object.entries(schemas)) {
    const key = resource.replace(/-/g, "_");
    document.components.schemas[key] = zodToJsonSchema(schema as any, {
      $refStrategy: "none",
      target: "openApi3",
    }) as any;
    document.paths["/api/" + resource] = {
      get: {
        tags: ["Operations"],
        summary: "List " + resource,
        security: [{ bearer: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 500 },
          },
        ],
        responses: {
          200: { description: "Paginated records" },
          401: { description: "Sign in required" },
          403: { description: "Role does not allow this resource" },
        },
      },
      post: {
        tags: ["Operations"],
        summary: "Create " + resource,
        security: [{ bearer: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/" + key },
            },
          },
        },
        responses: {
          201: { description: "Created atomically with an audit record" },
          400: { description: "Invalid input or business transition" },
          403: { description: "Role does not allow creation" },
          409: { description: "Duplicate or concurrent change" },
        },
      },
    };
  }
  SwaggerModule.setup("api/docs", app, document);
  await app.init();
  return app;
}
async function main() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT || 3001), "0.0.0.0");
}
if (require.main === module) main();
export { AppModule, db, generateSchedules, Errors };
