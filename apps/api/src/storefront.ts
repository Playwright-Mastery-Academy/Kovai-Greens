import { HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { dayKey } from './domain';
const QR = require('qrcode') as { toDataURL: (value: string, options?: any) => Promise<string> };
const razorpayHost = (value: string, pageOnly = false) => {
  if (!value) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password &&
    (pageOnly ? (u.hostname === 'pages.razorpay.com' || (u.hostname === 'razorpay.me' && /^\/@[a-zA-Z0-9._-]+\/?$/.test(u.pathname))) : ['rzp.io', 'razorpay.me', 'razorpay.com'].includes(u.hostname) || u.hostname.endsWith('.razorpay.com')); } catch { return false; }
};
export const storeSettingsSchema = {
  upiId: z.string().trim().max(120).refine(v => !v || /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(v), 'Enter a valid UPI ID').optional(),
  upiPayeeName: z.string().trim().max(100).optional(),
  razorpayPaymentPage: z.string().trim().max(500).refine(v => razorpayHost(v, true), 'Use a Razorpay.me profile or reusable Razorpay Payment Page; assign single-use links per order').optional(),
};
export const paymentLinkSchema = z.object({ url: z.string().trim().max(500).refine(v => razorpayHost(v), 'Use an HTTPS Razorpay payment link') }).strict();
export const checkoutSchema = z.object({
  requestId: z.string().uuid(),
  customer: z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
    email: z.union([z.string().email(), z.literal('')]).default(''), address: z.string().trim().min(10).max(500),
    area: z.string().trim().min(2).max(100), pincode: z.string().regex(/^641\d{3}$/, 'Delivery is currently available within Coimbatore (641xxx)') }).strict(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().trim().max(500).default(''),
  items: z.array(z.object({ productId: z.string().uuid(), packGrams: z.number().int().positive(), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(20),
}).strict();
export async function storeConfig(db: PrismaClient) {
  const settings = Object.fromEntries((await db.setting.findMany({ where: { key: { in: ['businessName', 'upiId', 'upiPayeeName', 'razorpayPaymentPage'] } } })).map(v => [v.key, v.value]));
  return { businessName: settings.businessName || 'Kovai Greens', upiId: settings.upiId || '', upiPayeeName: settings.upiPayeeName || settings.businessName || 'Kovai Greens',
    razorpayPaymentPage: settings.razorpayPaymentPage || '', training: process.env.APP_ENV === 'training' };
}
export async function catalog(db: PrismaClient) {
  const minDate = dayKey(new Date(Date.now() + 86400000));
  const maxDate = dayKey(new Date(Date.now() + 14 * 86400000));
  const dates = Array.from({ length: 14 }, (_, i) => dayKey(new Date(Date.now() + (i + 1) * 86400000)));
  const products = await db.product.findMany({ where: { active: true }, orderBy: { name: 'asc' },
    select: { id: true, name: true, variety: true, formats: { select: { grams: true, pricePaise: true }, orderBy: { grams: 'asc' } },
      harvests: { select: { inventory: { select: { id: true, onHandGrams: true, reservedGrams: true, packedGrams: true, bestBefore: true } } } } } });
  const config = await storeConfig(db);
  return { businessName: config.businessName, training: config.training, minDate, maxDate,
    products: products.map(({ harvests, ...product }) => {
      // Match confirmation's FEFO ordering and delivery-time expiry boundary.
      const lots = harvests.flatMap(h => h.inventory ? [h.inventory] : []).sort((a, b) =>
        (a.bestBefore?.getTime() ?? Infinity) - (b.bestBefore?.getTime() ?? Infinity) || a.id.localeCompare(b.id));
      const stockByDate = Object.fromEntries(dates.map(date => [date, lots
        .filter(lot => !lot.bestBefore || lot.bestBefore >= new Date(date + 'T16:00:00+05:30'))
        .map(lot => Math.max(0, lot.onHandGrams - lot.reservedGrams - lot.packedGrams))]));
      return { ...product, stockByDate, availableGrams: stockByDate[minDate].reduce((sum, grams) => sum + grams, 0) };
    }) };
}

const attempts = new Map<string, { count: number; until: number }>();
export function limitCheckout(ip: string) {
  const now = Date.now(); for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const value = attempts.get(ip) || { count: 0, until: now + 3600000 };
  if (++value.count > 15) throw new HttpException('Too many checkout attempts. Please try again later.', 429);
  attempts.set(ip, value);
}
export async function checkout(db: PrismaClient, body: unknown, transact: any, transition: any) {
  const input = checkoutSchema.parse(body);
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const existing = await db.storeCheckout.findUnique({ where: { requestId: input.requestId } });
  if (existing) { if (existing.requestHash !== hash) throw new HttpException('This checkout was already used. Start a new checkout.', 409); return receipt(db, existing.token); }
  const deliveryAt = new Date(input.deliveryDate + 'T16:00:00+05:30');
  if (Number.isNaN(deliveryAt.getTime()) || dayKey(deliveryAt) !== input.deliveryDate || input.deliveryDate < dayKey(new Date(Date.now() + 86400000)) || input.deliveryDate > dayKey(new Date(Date.now() + 14 * 86400000))) throw new HttpException('Choose a delivery date between tomorrow and the next 14 days.', 400);
  const keys = input.items.map(i => `${i.productId}:${i.packGrams}`);
  if (new Set(keys).size !== keys.length) throw new HttpException('Combine duplicate cart items.', 400);
  let token: string;
  try {
    token = await transact(async (tx: any) => {
      const repeated = await tx.storeCheckout.findUnique({ where: { requestId: input.requestId } });
      if (repeated) { if (repeated.requestHash !== hash) throw new HttpException('Checkout contents changed.', 409); return repeated.token; }
      const products = await tx.product.findMany({ where: { id: { in: input.items.map(i => i.productId) }, active: true }, include: { formats: true } });
      const items = input.items.map(item => {
        const product = products.find((p: any) => p.id === item.productId), format = product?.formats.find((f: any) => f.grams === item.packGrams);
        if (!format) throw new HttpException('A product or pack size is no longer available. Refresh your cart.', 400);
        return { ...item, unitPricePaise: format.pricePaise };
      });
      const total = items.reduce((sum, i) => sum + i.quantity * i.unitPricePaise, 0);
      if (!Number.isSafeInteger(total) || total <= 0 || total > 100000000) throw new HttpException('Invalid order amount.', 400);
      const c = await tx.customer.create({ data: { name: input.customer.name, phone: input.customer.phone, email: input.customer.email,
        type: 'INDIVIDUAL', billingAddress: input.customer.address, deliveryAddress: input.customer.address, area: input.customer.area,
        city: 'Coimbatore', pincode: input.customer.pincode, notes: 'Customer storefront guest checkout' } });
      const order = await tx.order.create({ data: { number: 'WEB-' + randomUUID().slice(0, 8).toUpperCase(), customerId: c.id, deliveryAt,
        subtotalPaise: total, totalPaise: total, notes: 'Customer storefront. Payment requires admin verification.' + (input.notes ? '\nDelivery note: ' + input.notes : ''), items: { create: items } } });
      await transition(tx, order.id, 'CONFIRMED', { id: 'customer-storefront', name: 'Customer storefront', role: 'OWNER' });
      const saved = await tx.storeCheckout.create({ data: { requestId: input.requestId, requestHash: hash, orderId: order.id, token: randomBytes(24).toString('hex') } });
      await tx.auditLog.create({ data: { actorId: 'customer-storefront', action: 'STOREFRONT_CHECKOUT', entity: 'orders', entityId: order.id, newValue: { totalPaise: total } } });
      return saved.token;
    });
  } catch (error: any) {
    if (error.code === 'P2002') { const repeated = await db.storeCheckout.findUnique({ where: { requestId: input.requestId } }); if (repeated?.requestHash === hash) return receipt(db, repeated.token); }
    throw error;
  }
  return receipt(db, token!);
}
export async function receipt(db: PrismaClient, token: string) {
  z.string().regex(/^[a-f0-9]{48}$/).parse(token);
  const saved = await db.storeCheckout.findUnique({ where: { token }, include: { order: { include: { items: { include: { product: { select: { name: true } } } }, payments: true } } } });
  if (!saved) throw new HttpException('Order link not found.', 404);
  const config = await storeConfig(db), order = saved.order;
  const paid = order.payments.reduce((sum, p) => sum + (p.kind === 'REFUND' ? -p.amountPaise : p.amountPaise), 0);
  const balance = Math.max(0, order.totalPaise - paid), payable = order.status !== 'CANCELLED' && balance > 0;
  const upi = payable && config.upiId ? 'upi://pay?' + new URLSearchParams({ pa: config.upiId, pn: config.upiPayeeName, am: (balance / 100).toFixed(2), cu: 'INR', tn: order.number, tr: order.number }).toString() : '';
  return { token, number: order.number, status: order.status, deliveryAt: order.deliveryAt, totalPaise: order.totalPaise, balancePaise: balance,
    paymentStatus: order.status === 'CANCELLED' ? 'CANCELLED' : balance === 0 ? 'PAID' : saved.paymentReference ? 'AWAITING_VERIFICATION' : 'AWAITING_PAYMENT',
    reference: saved.paymentReference, businessName: config.businessName, training: config.training,
    items: order.items.map(i => ({ name: i.product.name, packGrams: i.packGrams, quantity: i.quantity, unitPricePaise: i.unitPricePaise })),
    payment: { upiId: payable ? config.upiId : '', payeeName: config.upiPayeeName, upiUrl: upi, qrDataUrl: upi ? await QR.toDataURL(upi, { width: 320, margin: 2 }) : '',
      razorpayUrl: payable ? saved.razorpayLink || config.razorpayPaymentPage : '' } };
}
export async function submitReference(db: PrismaClient, token: string, body: unknown) {
  const { reference } = z.object({ reference: z.string().trim().min(6).max(80).regex(/^[a-zA-Z0-9 _-]+$/) }).strict().parse(body);
  const current = await receipt(db, token);
  if (current.status === 'CANCELLED' || current.balancePaise === 0) throw new HttpException('This order does not need payment.', 400);
  await db.$transaction(async tx => {
    const record = await tx.storeCheckout.findUniqueOrThrow({ where: { token } });
    await tx.storeCheckout.update({ where: { token }, data: { paymentReference: reference } });
    await tx.auditLog.create({ data: { actorId: 'customer-storefront', action: 'PAYMENT_REFERENCE_SUBMITTED', entity: 'orders', entityId: record.orderId, newValue: { reference, verified: false } } });
  });
  return receipt(db, token);
}
