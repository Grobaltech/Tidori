import { useEffect, useState } from 'react';
import { FaPlus, FaSave, FaSyncAlt } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const field = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]';
const types = ['Appointment with the Pastor','Pastoral appointment','Prayer and counselling','Ministry meeting','Church office visit','Other'];
const modes = [['in_person','In person'],['phone','Phone'],['audio','Audio call'],['video','Video call']];

export default function AppointmentFeeManager() {
  const [rules,setRules] = useState([]);
  const [form,setForm] = useState({appointment_type:types[0],meeting_mode:'in_person',amount:'',currency:'UGX',is_active:true});
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    const {data,error:queryError}=await supabase.from('appointment_fee_rules').select('*').order('appointment_type').order('meeting_mode');
    if(queryError)setError(queryError.message); else setRules(data||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const amount=Number(form.amount);
    if(!Number.isFinite(amount)||amount<0||amount>1000000){setError('Enter a valid fee. Use zero only when the appointment is intentionally free.');setBusy(false);return;}
    const {data:userData}=await supabase.auth.getUser();
    const payload={appointment_type:form.appointment_type,meeting_mode:form.meeting_mode,amount,currency:form.currency,is_active:form.is_active,updated_by:userData?.user?.id||null,updated_at:new Date().toISOString()};
    const {error:saveError}=await supabase.from('appointment_fee_rules').upsert(payload,{onConflict:'appointment_type,meeting_mode'});
    if(saveError)setError(saveError.message);else{setNotice('Appointment fee rule saved. Public booking prices will update immediately.');setForm(v=>({...v,amount:''}));await load();}
    setBusy(false);
  };

  const edit = row => setForm({appointment_type:row.appointment_type,meeting_mode:row.meeting_mode,amount:String(row.amount),currency:row.currency||'UGX',is_active:row.is_active});
  const toggle = async row => {
    setBusy(true);setError('');setNotice('');
    const {error:updateError}=await supabase.from('appointment_fee_rules').update({is_active:!row.is_active,updated_at:new Date().toISOString()}).eq('id',row.id);
    if(updateError)setError(updateError.message);else{setNotice('Fee availability updated.');await load();}
    setBusy(false);
  };

  return <section className="admin-card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">Automatic appointment pricing</h2><p className="admin-muted mt-1">Set a fee for each appointment type and meeting method. A zero fee is treated as free only when you save that rule.</p></div><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"><FaSyncAlt className={loading?'mr-2 inline animate-spin':'mr-2 inline'}/>Refresh</button></div>
    {error&&<p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <form onSubmit={save} className="grid gap-3 border-b border-gray-100 bg-blue-50/30 p-5 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold text-gray-600">Appointment type<select className={field+' mt-1'} value={form.appointment_type} onChange={e=>setForm(v=>({...v,appointment_type:e.target.value}))}>{types.map(t=><option key={t}>{t}</option>)}</select></label>
      <label className="text-xs font-semibold text-gray-600">Meeting method<select className={field+' mt-1'} value={form.meeting_mode} onChange={e=>setForm(v=>({...v,meeting_mode:e.target.value}))}>{modes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs font-semibold text-gray-600">Fee amount<input className={field+' mt-1'} type="number" min="0" max="1000000" step="0.01" required value={form.amount} onChange={e=>setForm(v=>({...v,amount:e.target.value}))} placeholder="e.g. 20000 (0 = free)"/></label>
      <label className="text-xs font-semibold text-gray-600">Currency<select className={field+' mt-1'} value={form.currency} onChange={e=>setForm(v=>({...v,currency:e.target.value}))}><option>UGX</option><option>USD</option></select></label>
      <button disabled={busy} className="self-end rounded-lg bg-[#009cff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FaSave className="mr-2 inline"/>{busy?'Saving…':'Save fee rule'}</button>
    </form>
    <div className="overflow-x-auto"><table className="admin-table w-full min-w-[650px]"><thead><tr><th>Appointment</th><th>Meeting method</th><th>Fee</th><th>Availability</th><th>Action</th></tr></thead><tbody>{rules.map(row=><tr key={row.id}><td>{row.appointment_type}</td><td>{modes.find(x=>x[0]===row.meeting_mode)?.[1]||row.meeting_mode}</td><td><strong>{row.currency} {Number(row.amount).toLocaleString('en-UG')}</strong>{Number(row.amount)===0&&<span className="ml-2 text-xs text-emerald-700">Free</span>}</td><td><span className={row.is_active?'text-emerald-700':'text-gray-400'}>{row.is_active?'Active':'Disabled'}</span></td><td><div className="flex gap-2"><button type="button" onClick={()=>edit(row)} className="text-xs font-semibold text-[#009cff]">Edit</button><button type="button" disabled={busy} onClick={()=>toggle(row)} className="text-xs font-semibold text-gray-600">{row.is_active?'Disable':'Enable'}</button></div></td></tr>)}</tbody></table>{!loading&&!rules.length&&<div className="admin-empty">No fee rules configured. Public appointment requests remain unavailable until you add a rule.</div>}{loading&&<div className="admin-empty">Loading fee rules…</div>}</div>
  </section>;
}
