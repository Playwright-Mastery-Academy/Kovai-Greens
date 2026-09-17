import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, Leaf, Minus, Plus, ShoppingBag, Sprout, Truck, X, RefreshCw, ShieldCheck } from 'lucide-react';
import './shop.css';
type Product = { id: string; name: string; variety: string; availableGrams: number; formats: { grams: number; pricePaise: number }[] };
type CartItem = { productId: string; packGrams: number; quantity: number };
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n / 100);
async function request(path: string, body?: unknown) {
  const response = await fetch('/api/store/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({ message: 'Unable to reach the farm. Please try again.' }));
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}
function readCart(): CartItem[] { try { const data = JSON.parse(localStorage.getItem('kg-cart-v1') || '[]'); return Array.isArray(data) ? data.filter(i => typeof i.productId === 'string' && Number.isInteger(i.packGrams) && i.packGrams > 0 && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20).slice(0, 20) : []; } catch { return []; } }
const flavors: Record<string, string> = { Sunflower: 'Nutty & crisp', 'Pea Shoots': 'Sweet & tender', Radish: 'Bright & peppery', Broccoli: 'Mild & delicate', Mustard: 'Bold & peppery', 'Red Amaranth': 'Earthy & vibrant', Kale: 'Mellow & fresh', 'Purple Kohlrabi': 'Crisp & colourful', Basil: 'Aromatic & leafy', 'Garden Cress': 'Fresh & peppery' };
function ProductCard({ product, index, add }: { product: Product; index: number; add: (p: Product, grams: number) => void }) {
  const [grams, setGrams] = useState(product.formats.find(f => f.grams === 100)?.grams || product.formats[0]?.grams);
  const format = product.formats.find(f => f.grams === grams), available = !!format && product.availableGrams >= grams;
  return <article className="shop-product"><div className={'shop-plant plant-' + index % 5} aria-hidden="true"><span className="plant-orbit"/><Sprout className="plant-one"/><Sprout className="plant-two"/><Leaf className="plant-three"/><span className="plant-caption">KOVAI GREENS / {String(index + 1).padStart(2, '0')}</span></div>
    <div className="shop-product-body"><div className="shop-product-title"><h3>{product.name}</h3><span>{available ? 'Available' : 'Sold out'}</span></div><p>{flavors[product.variety] || 'A little green for your everyday plate'}</p>
      <label className="shop-pack">Choose your pack<select aria-label={'Pack size for ' + product.name} value={grams} onChange={e => setGrams(Number(e.target.value))}>{product.formats.map(f => <option key={f.grams} value={f.grams}>{f.grams} g</option>)}</select></label>
      <div className="shop-product-bottom"><strong>{money(format?.pricePaise || 0)}</strong><button className="shop-add" disabled={!available} onClick={() => add(product, grams)} aria-label={'Add ' + product.name + ' to cart'}><Plus size={17}/> Add to cart</button></div>
    </div></article>;
}
export default function Shop() {
  const location = useLocation(), navigate = useNavigate();
  const [catalog, setCatalog] = useState<any>(null), [loadError, setLoadError] = useState(''), [cart, setCart] = useState<CartItem[]>(readCart), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [receipt, setReceipt] = useState<any>(null), [reference, setReference] = useState('');
  const checkout = location.pathname === '/shop/checkout', token = location.pathname.startsWith('/shop/order/') ? location.pathname.slice('/shop/order/'.length) : '';
  const load = () => { setLoadError(''); request('catalog').then(setCatalog).catch(e => setLoadError(e.message)); };
  useEffect(load, []);
  useEffect(() => { try { localStorage.setItem('kg-cart-v1', JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { setError(''); setNotice(''); window.scrollTo(0, 0); if (token) { setReceipt(null); request('orders/' + token).then(r => { setReceipt(r); setReference(r.reference || ''); }).catch(e => setError(e.message)); } }, [location.pathname]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); } }, [notice]);
  const products: Product[] = catalog?.products || [];
  const lines = cart.map(item => { const product = products.find(p => p.id === item.productId); return { ...item, product, format: product?.formats.find(f => f.grams === item.packGrams) }; });
  const total = lines.reduce((sum, item) => sum + (item.format?.pricePaise || 0) * item.quantity, 0), count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const invalid = lines.some(i => !i.format || !i.product || cart.filter(c => c.productId === i.productId).reduce((s, c) => s + c.packGrams * c.quantity, 0) > i.product.availableGrams);
  function add(product: Product, grams: number) {
    const used = cart.filter(i => i.productId === product.id).reduce((s, i) => s + i.packGrams * i.quantity, 0);
    const existing = cart.find(i => i.productId === product.id && i.packGrams === grams);
    if (used + grams > product.availableGrams || (existing?.quantity || 0) >= 20 || (!existing && cart.length >= 20)) { setNotice('That quantity is not available. Review your cart.'); return; }
    setCart(old => existing ? old.map(i => i.productId === product.id && i.packGrams === grams ? { ...i, quantity: i.quantity + 1 } : i) : [...old, { productId: product.id, packGrams: grams, quantity: 1 }]);
    setNotice(product.name + ' added to your cart');
  }
  function change(item: CartItem, delta: number) {
    if (delta > 0) { const product = products.find(p => p.id === item.productId); if (product) add(product, item.packGrams); }
    else setCart(old => old.flatMap(i => i.productId === item.productId && i.packGrams === item.packGrams ? i.quantity === 1 ? [] : [{ ...i, quantity: i.quantity - 1 }] : [i]));
  }
  async function placeOrder(e: React.FormEvent) {
    e.preventDefault(); if (busy || !cart.length || invalid) return;
    const fields = new FormData(e.currentTarget as HTMLFormElement);
    const form = Object.fromEntries(["name", "phone", "email", "address", "area", "pincode", "deliveryDate", "notes"].map(key => [key, String(fields.get(key) || "")]));
    setBusy(true); setError('');
    try {
      const { deliveryDate, notes, ...customer } = form;
      const payload = { customer, deliveryDate, notes, items: cart };
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      const hash = Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
      let previous: any = null; try { previous = JSON.parse(sessionStorage.getItem('kg-checkout-attempt') || 'null'); } catch {}
      const requestId = previous?.hash === hash ? previous.requestId : crypto.randomUUID();
      sessionStorage.setItem('kg-checkout-attempt', JSON.stringify({ hash, requestId }));
      const saved = await request('checkout', { ...payload, requestId });
      setCart([]); sessionStorage.removeItem('kg-checkout-attempt'); sessionStorage.setItem('kg-last-order', saved.token); navigate('/shop/order/' + saved.token);
    } catch (e: any) { setError(e.message); load(); } finally { setBusy(false); }
  }
  const name = catalog?.businessName || 'Kovai Greens';
  return <div className="shop-app"><div className="shop-topline">GROWN WITH CARE. MADE FOR EVERYDAY PLATES. <span>COIMBATORE</span></div>
    <header className="shop-header"><a href="/shop" className="shop-brand"><span><Sprout size={28}/></span><b>{name}<small>THE MICROGREENS STORE</small></b></a><nav><a href="/shop#greens">Our greens</a><a href="/">Farm admin <ArrowUpRight size={13}/></a><button className="shop-cart-button" onClick={() => navigate('/shop/checkout')}><ShoppingBag size={19}/> Your bag <span>{count}</span></button></nav></header>
    {catalog?.training && <div className="shop-training">Training store · Fictional inventory and orders for testing.</div>}
    {notice && <div className="shop-toast" role="status"><Check size={18}/>{notice}</div>}
    <main className="shop-main">{loadError ? <section className="shop-empty"><h1>We couldn’t load the store</h1><p role="alert">{loadError}</p><button className="shop-primary" onClick={load}>Try again</button></section> : !catalog ? <section className="shop-empty" role="status">Loading the greens…</section> : token ? <>
      <button className="shop-back" onClick={() => navigate('/shop')}><ChevronLeft size={16}/> Back to the greens</button>
      {error && <p className="shop-error" role="alert">{error}</p>}
      {!receipt && !error && <div className="shop-empty" role="status">Loading your order…</div>}
      {receipt && <div className="shop-receipt"><section className="shop-receipt-heading"><span className="shop-check"><Check size={26}/></span><p className="shop-eyebrow">THANK YOU FOR CHOOSING LOCAL</p><h1>{receipt.paymentStatus === 'PAID' ? 'Payment confirmed.' : receipt.status === 'CANCELLED' ? 'Order cancelled.' : 'Your greens are reserved.'}</h1><p>Order <strong>{receipt.number}</strong> · {receipt.status.replaceAll('_', ' ').toLowerCase()}</p><p>Delivery requested for {new Date(receipt.deliveryAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' })}. The farm will coordinate delivery with you.</p></section>
      <div className="shop-checkout-grid"><section className="shop-paper"><h2>{receipt.paymentStatus === 'PAID' ? 'All settled' : 'Complete your payment'}</h2><div className="shop-payment-status">{receipt.paymentStatus.replaceAll('_', ' ')}</div>
      {receipt.paymentStatus === 'AWAITING_VERIFICATION' && <p className="shop-note">Reference received. The farm will check the payment before marking this order paid. Please don’t pay again.</p>}
      {receipt.balancePaise > 0 && receipt.status !== 'CANCELLED' && <><p className="shop-note">Amount to pay: <strong>{money(receipt.balancePaise)}</strong>. Include <strong>{receipt.number}</strong> as your payment reference.</p>
      {receipt.payment.upiUrl && <div className="shop-upi"><img src={receipt.payment.qrDataUrl} alt={'UPI payment QR for ' + receipt.number} width="240" height="240"/><div><h3>Scan & pay with UPI</h3><p>{receipt.payment.payeeName}</p><code>{receipt.payment.upiId}</code><a className="shop-primary" href={receipt.payment.upiUrl}>Open your UPI app <ArrowUpRight size={16}/></a></div></div>}
      {receipt.payment.razorpayUrl && <div className="shop-razorpay"><a className="shop-primary" href={receipt.payment.razorpayUrl} target="_blank" rel="noopener noreferrer">Pay on Razorpay <ArrowUpRight size={16}/></a><p>Check the amount and payee on Razorpay before paying. Returning here does not confirm payment.</p></div>}
      {!receipt.payment.upiUrl && !receipt.payment.razorpayUrl && <div className="shop-payment-pending"><ShieldCheck/><h3>Your order is saved</h3><p>The farm hasn’t published payment details yet. Keep this order link and check back for your payment link or UPI QR.</p></div>}
      <form className="shop-reference" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const r = await request('orders/' + token + '/payment-reference', { reference }); setReceipt(r); setNotice('Reference submitted for verification'); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }}><h3>Already made the payment?</h3><label>UPI transaction ID / payment reference<input required minLength={6} maxLength={80} pattern="[a-zA-Z0-9 _\-]+" value={reference} onChange={e => setReference(e.target.value)}/></label><button className="shop-secondary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</button></form></>}
      <button className="shop-back" disabled={busy} onClick={async () => { setBusy(true); try { setReceipt(await request('orders/' + token)); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }}><RefreshCw size={15}/> Refresh payment status</button></section>
      <aside className="shop-paper"><h2>Your order</h2>{receipt.items.map((i: any, index: number) => <div className="shop-summary-line" key={index}><span>{i.name}<small>{i.packGrams} g × {i.quantity}</small></span><b>{money(i.quantity * i.unitPricePaise)}</b></div>)}<div className="shop-total"><span>Total</span><strong>{money(receipt.totalPaise)}</strong></div><p className="shop-note">Bookmark this private order link to check your order and payment status.</p><button className="shop-secondary" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice('Order link copied'); } catch { setNotice('Copy the address from your browser to save this order link.'); } }}>Copy order link</button></aside></div></div>}</>
      : checkout ? <><button className="shop-back" onClick={() => navigate('/shop')}><ChevronLeft size={16}/> Continue shopping</button><div className="shop-page-heading"><p className="shop-eyebrow">FROM OUR FARM TO YOUR TABLE</p><h1>Your bag, full of good things.</h1><p>Choose your greens. We’ll take care of the next steps.</p></div>
      {!cart.length ? <section className="shop-empty"><ShoppingBag size={44}/><h2>Your bag is waiting for something green.</h2><button className="shop-primary" onClick={() => navigate('/shop')}>Explore the greens <ArrowRight size={16}/></button></section> : <div className="shop-checkout-grid"><section className="shop-paper"><h2>Delivery details</h2><p className="shop-note">Guest checkout · Coimbatore delivery · No account needed</p><form className="shop-form" onSubmit={placeOrder}>
      <div className="shop-form-row"><label>Your name<input autoComplete="name" required minLength={2} maxLength={100} name="name" defaultValue=""/></label><label>Mobile number<input type="tel" autoComplete="tel" required pattern="(\+91)?[6-9][0-9]{9}" placeholder="10-digit mobile number" name="phone" defaultValue=""/></label></div>
      <label>Email <small>(optional)</small><input type="email" autoComplete="email" name="email" defaultValue=""/></label><label>Delivery address<textarea autoComplete="street-address" required minLength={10} maxLength={500} rows={3} name="address" defaultValue=""/></label>
      <div className="shop-form-row"><label>Area<input required minLength={2} maxLength={100} placeholder="e.g. RS Puram" name="area" defaultValue=""/></label><label>Pincode<input inputMode="numeric" autoComplete="postal-code" required pattern="641[0-9]{3}" placeholder="641xxx" name="pincode" defaultValue=""/></label></div>
      <label>Preferred delivery date<input type="date" required min={catalog.minDate} max={catalog.maxDate} name="deliveryDate" defaultValue=""/></label><label>Delivery note <small>(optional)</small><textarea maxLength={500} rows={2} name="notes" defaultValue=""/></label>
      {error && <p className="shop-error" role="alert">{error}</p>}{invalid && <p className="shop-error" role="alert">Some quantities are no longer available. Remove or reduce them before continuing.</p>}
      <p className="shop-note">By placing an order, you allow the farm to use these details to fulfil it. Stock is checked for your selected delivery date. Payment is made separately and verified by the farm.</p><button className="shop-primary shop-full" disabled={busy || invalid}>{busy ? 'Reserving your greens…' : 'Place order & continue to payment'}<ArrowRight size={18}/></button></form></section>
      <aside className="shop-paper shop-bag"><div className="shop-bag-heading"><h2>Your greens</h2><span>{count} packs</span></div>{lines.map(item => <div className="shop-bag-line" key={item.productId + item.packGrams}><span className="shop-bag-icon"><Sprout size={27}/></span><div><h3>{item.product?.name || 'Unavailable product'}</h3><p>{item.packGrams} g pack</p><div className="shop-quantity"><button aria-label={'Remove one ' + item.product?.name} onClick={() => change(item, -1)}><Minus size={14}/></button><span>{item.quantity}</span><button aria-label={'Add one ' + item.product?.name} onClick={() => change(item, 1)} disabled={item.quantity >= 20}><Plus size={14}/></button></div></div><div className="shop-bag-price"><b>{money((item.format?.pricePaise || 0) * item.quantity)}</b><button aria-label={'Remove ' + item.product?.name} onClick={() => setCart(old => old.filter(i => !(i.productId === item.productId && i.packGrams === item.packGrams)))}><X size={15}/></button></div></div>)}<div className="shop-total"><span>Order total</span><strong>{money(total)}</strong></div><p className="shop-note">Prices shown in INR. Delivery timing will be coordinated by the farm.</p><div className="shop-assurance"><Truck size={20}/><span>Picked for your everyday plate.<small>Available stock is reserved at checkout.</small></span></div></aside></div>}</>
      : <><section className="shop-hero"><div><p className="shop-eyebrow"><span/> SMALL GREENS. EVERYDAY GOODNESS.</p><h1>A little green.<br/>A lot to <em>love.</em></h1><p>Bring colour, crunch, and a fresh finishing touch to your plate. Explore microgreens from your Coimbatore farm.</p><a className="shop-primary" href="#greens">Find your greens <ArrowRight size={18}/></a><div className="shop-hero-note"><Leaf size={18}/> Thoughtfully grown. Simply enjoyed.</div></div><div className="shop-hero-art" aria-hidden="true"><div className="hero-ring"/><Sprout className="hero-sprout s1"/><Sprout className="hero-sprout s2"/><Sprout className="hero-sprout s3"/><div className="hero-seal">SMALL LEAVES<br/><b>BIG POSSIBILITIES</b><span>✳</span></div><span className="hero-art-caption">YOUR NEXT FAVOURITE INGREDIENT.</span></div></section>
      <section className="shop-benefits"><div><Sprout/><span>A variety for every plate<small>From mild to peppery</small></span></div><div><ShoppingBag/><span>Packs that fit your day<small>Choose the size you need</small></span></div><div><Truck/><span>Your neighbourhood farm<small>Serving Coimbatore</small></span></div></section>
      <section id="greens" className="shop-catalog"><div className="shop-section-heading"><div><p className="shop-eyebrow">THE GREEN LINE-UP</p><h2>Meet your everyday greens.</h2></div><p>{products.length} varieties · Your plate, your pick</p></div>{products.length ? <div className="shop-product-grid">{products.map((p, i) => <ProductCard key={p.id} product={p} index={i} add={add}/>)}</div> : <section className="shop-empty"><h2>Something green is growing.</h2><p>Our next harvest will appear here when it’s available.</p></section>}</section><section className="shop-bottom-banner"><Leaf size={35}/><div><h2>A fresh finish to an everyday meal.</h2><p>Top a toast. Brighten a bowl. Make your plate your own.</p></div><a href="/shop/checkout">View your bag <ArrowRight size={18}/></a></section></>}
    </main><footer className="shop-footer"><a href="/shop"><Sprout size={23}/><b>{name}</b></a><span>Rooted in Coimbatore. Made for your table.</span><a href="/">Farm admin <ArrowUpRight size={14}/></a></footer></div>;
}
