import { useEffect, useState } from 'react';
import { FaSave, FaSyncAlt } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const field='w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]';
const tiers=[
  {tier_code:'bronze',package_name:'Bronze',description:'Audio appointments and foundational pastoral support',color:'#CD7F32',benefits:['Pastoral care','Prayer ministry','Grief support groups','Youth and family ministries','Parenting support groups','Financial classes']},
  {tier_code:'silver',package_name:'Silver',description:'Audio and video appointments with structured guidance',color:'#A7A9AC',benefits:['Everything in Bronze','Addiction recovery groups','Divorce recovery groups','Marriage and premarital counselling or classes','Parenting classes','Life coaching or mentoring','Financial counselling']},
  {tier_code:'gold',package_name:'Gold',description:'Audio, video and physical appointments with personalised support',color:'#D4AF37',benefits:['Everything in Silver','Hospital and home visitation','Personalised marriage and family support','Personalised recovery support','Individual pastoral mentoring','Priority physical pastoral meetings']},
];

export default function AppointmentFeeManager(){
  const [packages,setPackages]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=async()=>{
    setLoading(true);setError('');
    const {data,error:queryError}=await supabase.from('pastor_appointment_packages').select('*').order('tier_code');
    if(queryError)setError(queryError.message);else setPackages(data||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  const update=(tier_code,patch)=>setPackages(rows=>rows.map(row=>row.tier_code===tier_code?{...row,...patch}:row));
  const save=async()=>{
    setBusy(true);setError('');setNotice('');
    const {data:userData}=await supabase.auth.getUser();
    const rows=tiers.map(tier=>{
      const current=packages.find(p=>p.tier_code===tier.tier_code)||{};
      return {tier_code:tier.tier_code,package_name:tier.package_name,amount:Number(current.amount||0),currency:current.currency||'UGX',is_active:current.is_active??true,updated_by:userData?.user?.id||null,updated_at:new Date().toISOString()};
    });
    if(rows.some(row=>!Number.isFinite(row.amount)||row.amount<0||row.amount>1000000)){setError('Enter valid package prices between 0 and 1,000,000.');setBusy(false);return;}
    const {error:saveError}=await supabase.from('pastor_appointment_packages').upsert(rows,{onConflict:'tier_code'});
    if(saveError)setError(saveError.message);else{setNotice('Bronze, Silver and Gold package pricing saved. Public booking prices are updated.');await load();}
    setBusy(false);
  };
  return <section className="admin-card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">Pastor appointment packages</h2><p className="admin-muted mt-1">Configure Bronze, Silver and Gold prices. Package benefits and appointment modes follow the approved hierarchy.</p></div><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"><FaSyncAlt className={loading?'mr-2 inline animate-spin':'mr-2 inline'}/>Refresh</button></div>
    {error&&<p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-4 p-5 md:grid-cols-3">{tiers.map(tier=>{
      const row=packages.find(p=>p.tier_code===tier.tier_code)||{tier_code:tier.tier_code,amount:'',currency:'UGX',is_active:true};
      return <div key={tier.tier_code} className="rounded-2xl border bg-white p-4" style={{borderTopWidth:4,borderTopColor:tier.color}}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{color:tier.color}}>{tier.package_name} ribbon</p><h3 className="mt-1 text-lg font-semibold">{tier.description}</h3>
        <label className="mt-4 block text-xs font-semibold text-gray-600">Package price<input className={field+' mt-1'} type="number" min="0" max="1000000" step="1" value={row.amount??''} onChange={e=>update(tier.tier_code,{amount:e.target.value})} placeholder="Enter amount"/></label>
        <label className="mt-3 block text-xs font-semibold text-gray-600">Currency<select className={field+' mt-1'} value={row.currency||'UGX'} onChange={e=>update(tier.tier_code,{currency:e.target.value})}><option>UGX</option><option>USD</option></select></label>
        <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={row.is_active??true} onChange={e=>update(tier.tier_code,{is_active:e.target.checked})}/> Available for booking</label>
        <div className="mt-4 border-t pt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Included benefits</p><ul className="space-y-1.5 text-xs text-gray-600">{tier.benefits.map(item=><li key={item}>✓ {item}</li>)}</ul></div>
      </div>;
    })}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4"><p className="text-xs text-gray-500">Crisis response, emergency pastoral intervention, therapist referrals and needs-based benevolence are not restricted by package.</p><button type="button" disabled={busy||loading} onClick={save} className="rounded-lg bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FaSave className="mr-2 inline"/>{busy?'Saving…':'Save package prices'}</button></div>
  </section>;
}
