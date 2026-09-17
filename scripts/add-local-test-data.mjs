import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

// Explicit, additive local fixtures. Credentials come only from the environment.
const base = 'http://localhost:4173/api/';
const tag = 'TEST-' + new Date().toISOString().slice(0, 10) + '-' + randomUUID().slice(0, 6);
const created = {};
let token = '';
async function call(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: {
    'Content-Type': 'application/json', Origin: 'http://localhost:4173',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
async function add(resource, body) {
  const record = await call(resource, 'POST', body);
  (created[resource] ||= []).push(record.id);
  return record;
}
const patch = (resource, id, body) => call(`${resource}/${id}`, 'PATCH', body);
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
try {
  if (!process.env.OWNER_PASSWORD) throw new Error('Set OWNER_PASSWORD before running.');
  const health = await call('health');
  if (health.environment !== 'training') throw new Error('Requires the local training environment.');
  token = (await call('auth/login', 'POST', { username: 'Aravind', password: process.env.OWNER_PASSWORD })).accessToken;
  const driver = (await call('delivery-drivers'));
  const drivers = Array.isArray(driver) ? driver : driver.data;
  if (!drivers?.length) throw new Error('An existing delivery driver is required.');
  const suppliers = [];
  for (const name of ['Nilgiri Seed Supplies', 'Kongu Grower Supplies']) suppliers.push(await add('suppliers', {
    name: `${tag} ${name}`, contact: 'Fictional test contact', phone: '0000000000', email: 'supplier@example.test',
    address: 'Fictional test address, Coimbatore', suppliedProducts: 'Test microgreen seeds',
  }));
  const products = [], batches = [];
  for (const [i, variety] of ['Kale', 'Purple Kohlrabi', 'Basil', 'Cress'].entries()) {
    const product = await add('products', { name: `${tag} ${variety}`, variety,
      description: 'Fictional testing product. Growing parameters and prices are examples only.',
      growingDays: 10 + i, yieldGramsPerTray: 300, seedGramsPerTray: 30,
      pricePaisePerKg: 120000 + i * 10000, lowStockGrams: i === 3 ? 15000 : 1000,
      formats: [25, 50, 100, 250].map(grams => ({ grams, pricePaise: (120 + i * 10) * grams })),
    });
    products.push(product);
    const seed = await add('seed-lots', { lotNumber: `${tag}-SEED-${i + 1}`, productId: product.id,
      supplierId: suppliers[i % 2].id, purchasedAt: day(-30), expiresAt: day(180),
      purchasedGrams: 10000, costPaise: 45000, location: `Test seed shelf ${i + 1}` });
    for (let j = 0; j < 4; j++) {
      const batch = await add('batches', { productId: product.id, seedLotId: seed.id,
        sownAt: day(j === 0 ? -14 : j === 1 ? -5 : 1), germinationAt: day(j === 0 ? -12 : j === 1 ? -3 : 3),
        harvestDueAt: day(j === 0 ? -1 : j === 1 ? 6 : 12), trays: j === 0 ? 40 : 8,
        seedGrams: j === 0 ? 1200 : 240, medium: 'Test coco coir', notes: `${tag} fictional batch` });
      batches.push(batch);
      const steps = j === 0 ? ['SOWN', 'GERMINATING', 'GROWING', 'READY_TO_HARVEST'] : j === 1 ? ['SOWN', 'GERMINATING', 'GROWING'] : j === 3 ? ['CANCELLED'] : [];
      for (const status of steps) await patch('batches', batch.id, { status });
      if (j === 0) await add('harvests', { batchId: batch.id, harvestedAt: day(-0.1),
        harvestedGrams: 12000, usableGrams: 11400, grade: 'Test Grade A',
        notes: `${tag} fictional harvest; 600 g rejected` });
    }
  }
  console.log('Added products, seed lots, batches and harvested inventory.');
  const customers = [];
  const types = ['INDIVIDUAL', 'SCHOOL', 'RESTAURANT', 'CAFE', 'HOTEL', 'RETAILER', 'INSTITUTION'];
  for (let i = 0; i < 14; i++) {
    const area = ['RS Puram', 'Peelamedu', 'Saibaba Colony', 'Vadavalli', 'Thudiyalur'][i % 5];
    customers.push(await add('customers', { name: `${tag} ${types[i % 7]} ${i + 1}`,
      type: types[i % 7], phone: '0000000000', email: `test-customer-${i + 1}@example.test`,
      billingAddress: `${i + 1} Fictional Test Street, ${area}`, deliveryAddress: `${i + 1} Fictional Test Street, ${area}`,
      area, pincode: '641034', paymentTermsDays: i % 7 === 0 ? 0 : 30, notes: 'Fictional testing customer' }));
  }
  const items = i => [0, 1].map(n => ({ productId: products[(i + n) % 4].id,
    packGrams: 50, quantity: 2 + i % 4, unitPricePaise: 6000 + ((i + n) % 4) * 500 }));
  const statuses = ['DRAFT', 'CONFIRMED', 'ALLOCATED', 'PACKING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  for (let i = 0; i < 32; i++) {
    const target = statuses[i % 8];
    const order = await add('orders', { customerId: customers[i % 14].id,
      deliveryAt: day(target === 'DELIVERED' ? 0 : 1 + i % 14), items: items(i),
      discountPaise: i % 3 === 0 ? 1000 : 0, notes: `${tag} scenario ${target}` });
    if (target === 'DRAFT') continue;
    let current = order;
    for (const status of statuses.slice(1, target === 'CANCELLED' ? 2 : statuses.indexOf(target) + 1)) {
      if (status === 'OUT_FOR_DELIVERY') {
        const delivery = (await call('deliveries?limit=500')).data.find(d => d.orderId === order.id);
        await patch('deliveries', delivery.id, { driverId: drivers[0].id, status: 'ASSIGNED',
          vehicle: 'TEST vehicle', route: 'Test Coimbatore route', timeSlot: '09:00–12:00' });
      }
      current = await patch('orders', order.id, { status });
    }
    if (['DELIVERED', 'CONFIRMED', 'CANCELLED'].includes(target)) {
      const amountPaise = target === 'CONFIRMED' ? Math.floor(current.totalPaise / 2) : current.totalPaise;
      await add('payments', { orderId: order.id, amountPaise, method: i % 2 ? 'UPI' : 'CASH',
        reference: `${tag}-PAY-${i}`, requestKey: randomUUID(), paidAt: day(0) });
      if (target === 'CANCELLED') {
        await patch('orders', order.id, { status: 'CANCELLED' });
        await add('payments', { orderId: order.id, amountPaise, method: 'UPI', kind: 'REFUND',
          reference: `${tag}-REFUND-${i}`, requestKey: randomUUID(), paidAt: day(0) });
      }
    }
  }
  console.log('Added 32 orders across eight stages, including payments and refunds.');
  for (let i = 0; i < 6; i++) {
    const school = i < 2;
    const schedule = await add('schedules', { customerId: customers[school ? 1 + i * 7 : i].id,
      kind: school ? 'SCHOOL' : 'SUBSCRIPTION', name: `${tag} ${school ? 'School program' : 'Weekly box'} ${i + 1}`,
      items: items(i), weekdays: i % 2 ? [2, 4] : [1, 3, 5], startAt: day(1), endAt: day(45),
      ...(school ? { participatingStudents: 40 + i * 20, grades: 'Aggregate test group' } : {}), billingCycle: 'MONTHLY' });
    if (i === 5) await patch('schedules', schedule.id, { status: 'PAUSED' });
  }
  for (const [i, category] of ['GROWING_MEDIA', 'TRAYS', 'PACKAGING', 'LABELS', 'ELECTRICITY', 'WATER', 'LABOUR', 'TRANSPORTATION', 'RENT', 'MARKETING', 'EQUIPMENT', 'MISCELLANEOUS'].entries()) {
    await add('expenses', { category, description: `${tag} fictional ${category.toLowerCase()} expense`,
      amountPaise: 15000 + i * 2500, incurredAt: day(-i), ...(i < 4 ? { batchId: batches[i * 4].id } : {}) });
  }
  for (const resource of Object.keys(created)) {
    const listing = await call(`${resource}?limit=500`);
    const ids = new Set(listing.data.map(r => r.id));
    if (created[resource].some(id => !ids.has(id))) throw new Error(`Read-back failed for ${resource}`);
  }
  console.log(JSON.stringify({ tag, added: Object.fromEntries(Object.entries(created).map(([k, v]) => [k, v.length])) }, null, 2));
} finally {
  await mkdir('.local-data', { recursive: true });
  await writeFile(`.local-data/${tag}.json`, JSON.stringify({ tag, created }, null, 2));
}
