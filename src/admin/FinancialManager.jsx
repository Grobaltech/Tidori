import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaWallet, FaPlus, FaSyncAlt, FaTrashAlt } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const field = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]';
const money = (value, currency) => `${currency} ${Number(value || 0).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`;
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-UG', { timeZone: 'Africa/Kampala' }) : '—';

export default function FinancialManager() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
  const monthStart = today.slice(0, 7) + '-01';
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [donations, setDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [pendingBursaries, setPendingBursaries] = useState([]);
  const [bursaries, setBursaries] = useState([]);
  const [reconciling, setReconciling] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ expense_date: today, category: 'Utilities', description: '', amount: '', currency: 'UGX', payment_method: 'Cash', reference: '', notes: '' });

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true); setError('');
    const [d, p, a, ap, b, bp, e] = await Promise.all([
      supabase.from('donation_pledges').select('id,name,amount,currency,status,paid_at,created_at,payment_method,confirmation_code').eq('status','paid').order('paid_at',{ascending:false}).limit(1000),
      supabase.from('donation_pledges').select('id,name,amount,currency,status,created_at,merchant_reference').eq('status','pending').order('created_at',{ascending:false}).limit(100),
      supabase.from('appointments').select('id,full_name,appointment_type,fee_amount,currency,payment_status,paid_at,created_at,payment_method,payment_reference,pesapal_merchant_reference,pesapal_order_tracking_id').eq('payment_status','paid').order('paid_at',{ascending:false}).limit(1000),
      supabase.from('appointments').select('id,full_name,appointment_type,fee_amount,currency,payment_status,created_at,pesapal_merchant_reference').in('payment_status',['unpaid','pending']).order('created_at',{ascending:false}).limit(100),
      supabase.from('bursary_applications').select('id,applicant_name,application_fee,currency,payment_status,paid_at,created_at,merchant_reference').eq('payment_status','paid').order('paid_at',{ascending:false}).limit(1000),
      supabase.from('bursary_applications').select('id,applicant_name,application_fee,currency,payment_status,created_at,merchant_reference').eq('payment_status','pending').eq('application_status','awaiting_payment').order('created_at',{ascending:false}).limit(100),
      supabase.from('finance_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
    ]);
    const failures = [d.error,p.error,a.error,ap.error,b.error,bp.error,e.error].filter(Boolean);
    if (failures.length) setError(failures.map(x=>x.message).join(' · '));
    setDonations(d.data || []); setPendingDonations(p.data || []);
    setAppointments(a.data || []); setPendingAppointments(ap.data || []);
    setBursaries(b.data || []); setPendingBursaries(bp.data || []);
    setExpenses(e.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const inRange = value => {
    const date = String(value || '').slice(0,10);
    return date >= start && date <= end;
  };
  const filteredDonations = donations.filter(r => inRange(r.paid_at || r.created_at));
  const filteredAppointments = appointments.filter(r => inRange(r.paid_at || r.created_at));
  const filteredBursaries = bursaries.filter(r => inRange(r.paid_at || r.created_at));
  const filteredExpenses = expenses.filter(r => inRange(r.expense_date));
  const pendingPayments = [
    ...pendingDonations.map(r => ({ ...r, payment_type: 'Donation', payer: r.name || 'Donor', amount: r.amount, reference: r.merchant_reference })),
    ...pendingAppointments.map(r => ({ ...r, payment_type: 'Appointment', payer: r.full_name, amount: r.fee_amount, reference: r.pesapal_merchant_reference })),
    ...pendingBursaries.map(r => ({ ...r, payment_type: 'Bursary application', payer: r.applicant_name || 'Applicant', amount: r.application_fee, reference: r.merchant_reference })),
  ].filter(r => r.reference);
  const totals = useMemo(() => {
    const sums = { income: {}, expenses: {}, net: {} };
    const add = (bucket, currency, amount) => { bucket[currency] = (bucket[currency] || 0) + Number(amount || 0); };
    [...filteredDonations, ...filteredAppointments, ...filteredBursaries].forEach(r => add(sums.income, r.currency || 'UGX', r.amount ?? r.fee_amount ?? r.application_fee));
    filteredExpenses.forEach(r => add(sums.expenses, r.currency || 'UGX', r.amount));
    new Set([...Object.keys(sums.income),...Object.keys(sums.expenses)]).forEach(c => { sums.net[c] = (sums.income[c] || 0) - (sums.expenses[c] || 0); });
    return sums;
  }, [filteredDonations, filteredAppointments, filteredExpenses]);

  const saveExpense = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from('finance_expenses').insert({
        ...form, amount: Number(form.amount), created_by: auth?.user?.id || null,
        reference: form.reference.trim() || null, notes: form.notes.trim() || null,
      });
      if (insertError) throw insertError;
      setNotice('Expense recorded.'); setShowForm(false);
      setForm({ expense_date: today, category: 'Utilities', description: '', amount: '', currency: 'UGX', payment_method: 'Cash', reference: '', notes: '' });
      await load();
    } catch (err) { setError(err.message || 'Could not record expense.'); }
    finally { setBusy(false); }
  };

  const reconcilePayment = async row => {
    const reference = row.merchant_reference;
    if (!reference) { setError('This pending record has no Pesapal merchant reference.'); return; }
    setReconciling(reference); setError(''); setNotice('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Your administrator session has expired. Please sign in again.');
      const response = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ reference }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Pesapal verification failed.');
      if (result.paymentStatus === 'paid') setNotice(`Payment verified successfully: ${money(row.amount, row.currency || 'UGX')} is now recorded as paid.`);
      else setNotice(`Pesapal currently reports this transaction as ${result.paymentStatus || 'pending'}. No paid status was applied.`);
      await load();
    } catch (err) { setError(err.message || 'Could not reconcile this payment.'); }
    finally { setReconciling(''); }
  };

  const deleteExpense = async row => {
    if (!window.confirm(`Delete expense “${row.description}”? This cannot be undone.`)) return;
    setError(''); setNotice('');
    const { error: deleteError } = await supabase.from('finance_expenses').delete().eq('id', row.id);
    if (deleteError) setError(deleteError.message); else { setNotice('Expense deleted.'); await load(); }
  };

  const exportCsv = () => {
    const rows = [
      ['Date','Type','Description','Category','Currency','Amount','Reference'],
      ...filteredDonations.map(r=>[r.paid_at||r.created_at,'Donation',r.name||'Donation','Giving',r.currency||'UGX',r.amount,r.confirmation_code||'']),
      ...filteredAppointments.map(r=>[r.paid_at||r.created_at,'Appointment',r.full_name,r.appointment_type,r.currency||'UGX',r.fee_amount,r.payment_reference||'']),
      ...filteredBursaries.map(r=>[r.paid_at||r.created_at,'Bursary application',r.applicant_name,'Application fee',r.currency||'UGX',r.application_fee,r.merchant_reference||'']),
      ...filteredExpenses.map(r=>[r.expense_date,'Expense',r.description,r.category,r.currency||'UGX',-Number(r.amount),r.reference||'']),
    ];
    const csv = rows.map(row=>row.map(v=>`"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download=`tidori-financial-report-${start}-to-${end}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-5">
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div><div className="flex items-center gap-2"><FaWallet className="text-lg text-[#009cff]" /><h2 className="admin-section-title">Financial overview</h2></div><p className="admin-muted mt-1">Verified Pesapal donations, paid appointments and recorded church expenses. Totals remain separated by currency.</p></div>
        <div className="flex gap-2"><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"><FaSyncAlt className={loading?'mr-2 inline animate-spin':'mr-2 inline'} />Refresh</button><button type="button" onClick={exportCsv} className="rounded-lg bg-[#009cff] px-3 py-2 text-sm font-semibold text-white">Export CSV</button></div>
      </div>
      <div className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">From<input className={field+' mt-1'} type="date" value={start} max={end} onChange={e=>setStart(e.target.value)} /></label>
        <label className="text-xs font-semibold text-gray-600">To<input className={field+' mt-1'} type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)} /></label>
      </div>
      {error && <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {['income','expenses','net'].map(key=><div key={key} className="rounded-lg bg-gray-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{key==='net'?'Net balance':key}</p>{Object.keys(totals[key]).length ? Object.entries(totals[key]).map(([currency,value])=><p key={currency} className="mt-2 text-lg font-bold text-[#191c24]">{money(value,currency)}</p>) : <p className="mt-2 text-lg font-bold text-gray-400">—</p>}</div>)}
      </div>
    </section>
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">Church expenses</h2><p className="admin-muted mt-1">Record verified expenditure with a reference where available.</p></div><button type="button" onClick={()=>setShowForm(v=>!v)} className="rounded-lg bg-[#009cff] px-3 py-2 text-sm font-semibold text-white"><FaPlus className="mr-2 inline" />Record expense</button></div>
      {showForm && <form onSubmit={saveExpense} className="grid gap-3 border-b border-gray-100 bg-blue-50/30 p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Date<input className={field+' mt-1'} type="date" required value={form.expense_date} onChange={e=>setForm(v=>({...v,expense_date:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Category<select className={field+' mt-1'} value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>{['Utilities','Rent','Transport','Welfare','Outreach','Equipment','Salaries','Communication','Maintenance','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Description<input className={field+' mt-1'} required minLength={2} maxLength={500} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Amount<input className={field+' mt-1'} type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm(v=>({...v,amount:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Currency<select className={field+' mt-1'} value={form.currency} onChange={e=>setForm(v=>({...v,currency:e.target.value}))}><option>UGX</option><option>USD</option></select></label>
        <label className="text-xs font-semibold text-gray-600">Payment method<input className={field+' mt-1'} maxLength={80} value={form.payment_method} onChange={e=>setForm(v=>({...v,payment_method:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Reference / receipt<input className={field+' mt-1'} maxLength={120} value={form.reference} onChange={e=>setForm(v=>({...v,reference:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Notes<textarea className={field+' mt-1'} maxLength={2000} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} /></label>
        <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">{busy?'Saving…':'Save expense'}</button><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold">Cancel</button></div>
      </form>}
      <div className="overflow-x-auto"><table className="admin-table w-full min-w-[760px]"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Reference</th><th>Action</th></tr></thead><tbody>
        {filteredExpenses.map(row=><tr key={row.id}><td>{dateLabel(row.expense_date)}</td><td>{row.category}</td><td>{row.description}</td><td>{money(row.amount,row.currency||'UGX')}</td><td>{row.payment_method}</td><td>{row.reference||'—'}</td><td><button type="button" onClick={()=>deleteExpense(row)} className="text-xs font-semibold text-red-600"><FaTrashAlt className="mr-1 inline" />Delete</button></td></tr>)}
      </tbody></table>{!loading&&!filteredExpenses.length&&<div className="admin-empty">No expenses recorded for this period.</div>}{loading&&<div className="admin-empty">Loading financial records…</div>}</div>
    </section>
    <section className="admin-card overflow-hidden">
    <section className="admin-card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Pending Pesapal payments</h2><p className="admin-muted mt-1">Recheck payments against Pesapal when the merchant dashboard shows completion but Tidori remains pending. This action is restricted to the super administrator.</p></div>
      <div className="overflow-x-auto"><table className="admin-table w-full min-w-[720px]"><thead><tr><th>Date</th><th>Type</th><th>Payer</th><th>Amount</th><th>Reference</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {pendingPayments.map(row=><tr key={row.payment_type+row.id}><td>{dateLabel(row.created_at)}</td><td>{row.payment_type}</td><td>{row.payer}</td><td>{money(row.amount,row.currency || 'UGX')}</td><td className="font-mono text-xs">{row.reference}</td><td><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Pending</span></td><td><button type="button" disabled={Boolean(reconciling)} onClick={()=>reconcilePayment({ ...row, merchant_reference: row.reference })} className="rounded-lg bg-[#009cff] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{reconciling===row.reference?'Checking Pesapal…':'Recheck Pesapal'}</button></td></tr>)}
      </tbody></table>{!loading&&!pendingPayments.length&&<div className="admin-empty">No pending Pesapal payments.</div>}</div>
    </section>
      <div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Verified income transactions</h2><p className="admin-muted mt-1">Only payments confirmed as paid by the database are included.</p></div>
      <div className="overflow-x-auto"><table className="admin-table w-full min-w-[700px]"><thead><tr><th>Date</th><th>Source</th><th>Payer</th><th>Details</th><th>Amount</th><th>Method</th></tr></thead><tbody>
        {filteredDonations.map(row=><tr key={'d'+row.id}><td>{dateLabel(row.paid_at||row.created_at)}</td><td>Donation</td><td>{row.name||'Donor'}</td><td>Giving</td><td>{money(row.amount,row.currency||'UGX')}</td><td>{row.payment_method||'Pesapal'}</td></tr>)}
        {filteredAppointments.map(row=><tr key={'a'+row.id}><td>{dateLabel(row.paid_at||row.created_at)}</td><td>Appointment</td><td>{row.full_name}</td><td>{row.appointment_type}</td><td>{money(row.fee_amount,row.currency||'UGX')}</td><td>{row.payment_method||'Pesapal'}</td></tr>)}
        {filteredBursaries.map(row=><tr key={'b'+row.id}><td>{dateLabel(row.paid_at||row.created_at)}</td><td>Bursary application</td><td>{row.applicant_name||'Applicant'}</td><td>Application fee</td><td>{money(row.application_fee,row.currency||'UGX')}</td><td>Pesapal</td></tr>)}
      </tbody></table>{!loading&&!filteredDonations.length&&!filteredAppointments.length&&!filteredBursaries.length&&<div className="admin-empty">No verified income transactions for this period.</div>}</div>
    </section>
    <p className="text-xs leading-5 text-gray-500">Financial totals are grouped by currency; UGX and USD are never added together. This module is an operational income-and-expense register, not a replacement for statutory accounting or bank reconciliation.</p>
  </div>;
}
