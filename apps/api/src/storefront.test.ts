import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = process.env.TEST_API_URL;
test('Storefront: authoritative pricing, atomic stock, idempotent checkout, private receipts, and manual payment verification', {skip:!base}, async()=>{
  let token='';
  async function call(path:string,method='GET',body?:any,auth=false){const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();return {status:r.status,data};}
  async function create(resource:string,body:any){const r=await call(resource,'POST',body,true);assert.equal(r.status,201,JSON.stringify(r.data));return r.data;}
  const login=await call('auth/login','POST',{username:process.env.TEST_OWNER_USERNAME,password:process.env.TEST_OWNER_PASSWORD});assert.equal(login.status,201);token=login.data.accessToken;
  const d=(offset:number)=>new Date(Date.now()+offset*86400000).toISOString();
  const p=await create('products',{name:'Storefront harvest',variety:'Radish',growingDays:8,yieldGramsPerTray:300,seedGramsPerTray:30,pricePaisePerKg:150000,formats:[{grams:50,pricePaise:9000},{grams:100,pricePaise:15000}]});
  const supplier=await create('suppliers',{name:'Isolated supplier',phone:'0000000000'});
  const seed=await create('seed-lots',{lotNumber:'SHOP-'+randomUUID(),productId:p.id,supplierId:supplier.id,purchasedAt:d(-30),expiresAt:d(100),purchasedGrams:2000,costPaise:10000,location:'Rack A'});
  const batch=await create('batches',{productId:p.id,seedLotId:seed.id,sownAt:d(-10),germinationAt:d(-8),harvestDueAt:d(-1),trays:5,seedGrams:150,medium:'Coir'});
  for(const status of ['SOWN','GERMINATING','GROWING','READY_TO_HARVEST'])assert.equal((await call('batches/'+batch.id,'PATCH',{status},true)).status,200);
  await create('harvests',{batchId:batch.id,harvestedAt:d(-.1),harvestedGrams:1100,usableGrams:1000,grade:'A',bestBefore:d(8)});
  const catalog=await call('store/catalog');assert.equal(catalog.status,200);assert.equal(catalog.data.products[0].availableGrams,1000);assert(!JSON.stringify(catalog.data).includes('supplier'));
  const payload={requestId:randomUUID(),customer:{name:'Checkout User',phone:'9999999999',email:'customer@example.test',address:'12 Fictional Garden Lane',area:'RS Puram',pincode:'641034'},deliveryDate:catalog.data.minDate,items:[{productId:p.id,packGrams:50,quantity:2}]};
  const wrongPrice=await call('store/checkout','POST',{...payload,items:[{...payload.items[0],unitPricePaise:1}]});assert.equal(wrongPrice.status,400);
  const responses=await Promise.all([call('store/checkout','POST',payload),call('store/checkout','POST',payload)]);
  for(const response of responses)assert.equal(response.status,201,JSON.stringify(response.data));
  const receipt=responses[0].data;assert.equal(receipt.token,responses[1].data.token);assert.equal(receipt.totalPaise,18000);assert.equal(receipt.status,'CONFIRMED');
  assert.equal((await call('orders','GET',undefined,true)).data.total,1);
  assert.equal((await call('inventory','GET',undefined,true)).data.data[0].reservedGrams,100);
  assert.equal((await call('store/checkout','POST',{...payload,notes:'changed'})).status,409);
  const failed=await call('store/checkout','POST',{...payload,requestId:randomUUID(),items:[{productId:p.id,packGrams:100,quantity:20}]});assert.equal(failed.status,400);
  assert.equal((await call('customers','GET',undefined,true)).data.total,1,'Failed stock checks roll back guest customers');
  assert.equal((await call('store-checkouts')).status,401);
  assert.equal((await call('settings','PATCH',{businessName:'Test Farm',farmAddress:'',upiId:'farm@bank',upiPayeeName:'Test Farm',razorpayPaymentPage:'https://pages.razorpay.com/store'},true)).status,200);
  const payment=await call('store/orders/'+receipt.token);assert.equal(payment.status,200);assert(payment.data.payment.qrDataUrl.startsWith('data:image/png;base64,'));
  const upi=new URL(payment.data.payment.upiUrl);assert.equal(upi.searchParams.get('am'),'180.00');assert.equal(upi.searchParams.get('pa'),'farm@bank');assert(!JSON.stringify(payment.data).includes('9999999999'));
  assert.equal((await call('store/orders/'+'0'.repeat(48))).status,404);
  const submitted=await call('store/orders/'+receipt.token+'/payment-reference','POST',{reference:'UPI123456789'});assert.equal(submitted.data.paymentStatus,'AWAITING_VERIFICATION');
  assert.equal((await call('payments','GET',undefined,true)).data.total,0,'Customer reference is not a payment');
  const saved=(await call('store-checkouts','GET',undefined,true)).data[0];
  for (const status of ['ALLOCATED','PACKING','PACKED','OUT_FOR_DELIVERY']) assert.equal((await call('orders/'+saved.orderId,'PATCH',{status},true)).status,200,'Driverless transition: '+status);
  const dispatched = await call('store/orders/'+receipt.token);
  assert.equal(dispatched.data.status,'OUT_FOR_DELIVERY');
  assert.equal(dispatched.data.paymentStatus,'AWAITING_VERIFICATION','Dispatch does not falsely record a payment');

  assert.equal((await call('store-checkouts/'+saved.id+'/payment-link','PATCH',{url:'javascript:alert(1)'},true)).status,400);
  assert.equal((await call('store-checkouts/'+saved.id+'/payment-link','PATCH',{url:'https://rzp.io/isolated-order'},true)).status,200);
  assert.equal((await call('store/orders/'+receipt.token)).data.payment.razorpayUrl,'https://rzp.io/isolated-order');
  await create('payments',{orderId:saved.orderId,amountPaise:18000,method:'UPI',reference:'VERIFIED123456789',requestKey:randomUUID(),paidAt:d(0)});
  const paid=(await call('store/orders/'+receipt.token)).data;assert.equal(paid.paymentStatus,'PAID');assert.equal(paid.balancePaise,0);assert.equal(paid.payment.upiUrl,'');
});
