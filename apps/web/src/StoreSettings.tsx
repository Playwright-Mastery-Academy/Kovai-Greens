import React, { useEffect, useState } from 'react';
import { api, money } from './api';
export default function StoreSettings() {
  const [values, setValues] = useState({ upiId: '', upiPayeeName: '', razorpayPaymentPage: '' });
  const [rows, setRows] = useState<any[]>([]), [links, setLinks] = useState<Record<string,string>>({});
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const load = () => api('store-checkouts').then(setRows).catch(e => setError(e.message));
  useEffect(() => { api('settings').then(s => setValues({ upiId: s.upiId || '', upiPayeeName: s.upiPayeeName || '', razorpayPaymentPage: s.razorpayPaymentPage || '' })).catch(e => setError(e.message)); load(); }, []);
  return <section className="panel settings-form" style={{ gridColumn: '1 / -1' }}><h2>Customer store & payments</h2><p><a href="/shop" target="_blank" rel="noopener noreferrer">Open the customer store ↗</a></p>
    <form onSubmit={async e => { e.preventDefault(); setError(''); setMessage(''); setBusy(true); try { const current = await api('settings'); await api('settings', { method:'PATCH', body:JSON.stringify({ businessName:current.businessName || 'Kovai Greens', farmAddress:current.farmAddress || '', ...values }) }); setMessage('Customer payment details saved.'); } catch(e:any){ setError(e.message); } finally { setBusy(false); } }}>
      <label>UPI ID<input value={values.upiId} onChange={e=>setValues({...values,upiId:e.target.value})} placeholder="your-business@bank"/></label>
      <label>UPI payee name<input value={values.upiPayeeName} onChange={e=>setValues({...values,upiPayeeName:e.target.value})} placeholder="Name customers should verify"/></label>
      <label>Razorpay.me profile or reusable Payment Page (optional)<input type="url" value={values.razorpayPaymentPage} onChange={e=>setValues({...values,razorpayPaymentPage:e.target.value})} placeholder="https://pages.razorpay.com/..."/></label>
      <p>UPI QR codes include the order amount and reference. Use a Razorpay.me profile or reusable Payment Page here; assign single-use Razorpay Payment Links to individual orders below. No gateway keys are required.</p>
      <button className="button primary" disabled={busy}>Save payment details</button>
    </form>{error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <h2 style={{marginTop:32}}>Customer web orders</h2><p>Payment references are unverified. Check your bank or Razorpay, then record the actual receipt under Payments. A customer submission never marks an order paid.</p>
    <button className="button secondary" onClick={load}>Refresh orders</button>
    {!rows.length?<p>No customer web orders yet.</p>:<div style={{overflowX:'auto',marginTop:16}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><thead><tr><th>Order / Customer</th><th>Total / Reference</th><th>Razorpay Payment Link</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:12,verticalAlign:'top'}}><b>{r.order.number}</b><p>{r.order.customer.name}</p><small>{r.order.status}</small><p><a href={'/shop/order/'+r.token} target="_blank" rel="noopener noreferrer">Customer order page ↗</a></p></td><td style={{padding:12,verticalAlign:'top'}}>{money(r.order.totalPaise)}<p>{r.paymentReference||'No reference submitted'}</p><a href="/payments">Record verified payment →</a></td><td style={{padding:12,minWidth:250}}><form onSubmit={async e=>{e.preventDefault();setError('');try{await api('store-checkouts/'+r.id+'/payment-link',{method:'PATCH',body:JSON.stringify({url:links[r.id]??r.razorpayLink})});setMessage('Order payment link saved.');load();}catch(e:any){setError(e.message);}}}><input type="url" aria-label={'Razorpay link for '+r.order.number} placeholder="https://rzp.io/..." value={links[r.id]??r.razorpayLink} onChange={e=>setLinks({...links,[r.id]:e.target.value})}/><button className="button secondary">Save order link</button></form></td></tr>)}</tbody></table></div>}
  </section>;
}
