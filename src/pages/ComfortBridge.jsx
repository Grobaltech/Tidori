import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import GiveForm from '../components/GiveForm';
import { supabase, supabaseReady } from '../lib/supabase';
import { useDocTitle } from '../hooks/hooks';

const money=(n,c='UGX')=>new Intl.NumberFormat('en-UG',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(n||0));

function SupportRequest(){
 const [form,setForm]=useState({full_name:'',email:'',phone:'',preferred_contact:'Phone',support_type:'Both spiritual guidance and prayer',loss_category:'Prefer to discuss privately',preferred_time:'',message:'',consent:false});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
 const change=e=>setForm(v=>({...v,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
 const submit=async e=>{
  e.preventDefault();setBusy(true);setError('');setReference('');
  if(!supabaseReady||!supabase){setError('The confidential request service is temporarily unavailable. Please contact the ministry office.');setBusy(false);return;}
  const {data,error:saveError}=await supabase.from('comfort_bridge_applications').insert({
   full_name:form.full_name.trim(),email:form.email.trim().toLowerCase(),phone:form.phone.trim()||null,
   preferred_contact:form.preferred_contact,support_type:form.support_type,loss_category:form.loss_category,
   preferred_time:form.preferred_time||null,private_message:form.message.trim()||null,consent_at:new Date().toISOString()
  }).select('id').single();
  if(saveError)setError('We could not submit your request securely. Please try again or contact the ministry office.');
  else{setReference('CB-'+data.id.slice(0,8).toUpperCase());setForm({full_name:'',email:'',phone:'',preferred_contact:'Phone',support_type:'Both spiritual guidance and prayer',loss_category:'Prefer to discuss privately',preferred_time:'',message:'',consent:false});}
  setBusy(false);
 };
 return <form onSubmit={submit} className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
  <h3 className="mb-2 text-2xl font-bold text-navy">Request confidential support</h3>
  <p className="mb-6 text-sm leading-6 text-gray-600">Share only what feels comfortable. Your request is private and is not visible to sponsors or the public.</p>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-semibold text-ink">Full name<input className="field mt-2" name="full_name" required maxLength="120" value={form.full_name} onChange={change}/></label>
   <label className="text-sm font-semibold text-ink">Email address<input className="field mt-2" type="email" name="email" required maxLength="200" value={form.email} onChange={change}/></label>
   <label className="text-sm font-semibold text-ink">Phone (optional)<input className="field mt-2" name="phone" type="tel" maxLength="40" value={form.phone} onChange={change}/></label>
   <label className="text-sm font-semibold text-ink">Preferred contact<select className="field mt-2" name="preferred_contact" value={form.preferred_contact} onChange={change}><option>Phone</option><option>Email</option><option>WhatsApp</option></select></label>
   <label className="text-sm font-semibold text-ink">Support requested<select className="field mt-2" name="support_type" value={form.support_type} onChange={change}><option>Both spiritual guidance and prayer</option><option>One-on-one spiritual guidance</option><option>14-day Prayer Altar covering</option></select></label>
   <label className="text-sm font-semibold text-ink">Type of loss (optional)<select className="field mt-2" name="loss_category" value={form.loss_category} onChange={change}><option>Prefer to discuss privately</option><option>Loss of a spouse</option><option>Loss of a child</option><option>Loss of a parent or family member</option><option>Pregnancy or infant loss</option><option>Other bereavement</option></select></label>
   <label className="text-sm font-semibold text-ink sm:col-span-2">Suitable time to contact you (optional)<input className="field mt-2" name="preferred_time" maxLength="120" placeholder="e.g. Weekday afternoons" value={form.preferred_time} onChange={change}/></label>
   <label className="text-sm font-semibold text-ink sm:col-span-2">Anything you would like the pastoral team to know (optional)<textarea className="field mt-2 min-h-28" name="message" maxLength="2000" value={form.message} onChange={change} placeholder="Share only what you feel comfortable sharing."/></label>
  </div>
  <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-gray-600"><input type="checkbox" name="consent" checked={form.consent} onChange={change} required className="mt-1"/><span>I consent to Tidori Ministries' authorised pastoral care team contacting me about this request. I understand this is spiritual and pastoral support, not clinical mental-health treatment.</span></label>
  {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {reference&&<p role="status" className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">Your confidential request has been received. Reference: <strong>{reference}</strong>. The pastoral care team will contact you using your preferred method.</p>}
  <button disabled={busy} className="btn-custom mt-5">{busy?'Submitting securely…':'Submit confidential request'}</button>
 </form>;
}

export default function ComfortBridge(){
 useDocTitle('The Comfort Bridge | Tidori Ministries');
 const [params]=useSearchParams();
 const [payment,setPayment]=useState(params.get('payment')||'');
 const [impact,setImpact]=useState({contributions:0,amount_ugx:0,amount_usd:0,people_supported:0});
 useEffect(()=>{let live=true;if(supabaseReady&&supabase)supabase.rpc('comfort_bridge_public_impact').then(({data,error})=>{if(live&&!error&&data)setImpact(data);});return()=>{live=false;};},[]);
 useEffect(()=>{
  const ref=params.get('reference');if(!ref||!/^TIDORI-[0-9a-f-]{36}$/i.test(ref))return;
  let live=true,attempt=0,timer;
  const check=async()=>{try{const r=await fetch('/api/payments/status?reference='+encodeURIComponent(ref),{cache:'no-store'});const d=await r.json();if(!live)return;const s=String(d.payment_status||d.status||'').toLowerCase();if(['paid','failed','reversed'].includes(s)){setPayment(s);return;}}catch{}if(live&&attempt++<12)timer=setTimeout(check,5000);};
  if(!['paid','failed','reversed'].includes(payment))check();return()=>{live=false;clearTimeout(timer);};
 },[params,payment]);
 return <>
  <PageHeader title="The Comfort Bridge"/>
  {payment&&<div className="container-page pt-6"><div role="status" className={payment==='paid'?'rounded-lg bg-green-50 p-4 text-green-800':'rounded-lg bg-amber-50 p-4 text-amber-900'}><strong>{payment==='paid'?'Thank you. Your Grace Pool contribution has been verified.':payment==='failed'?'The payment was not completed. You may try again.':'Your payment is being checked with Pesapal.'}</strong>{params.get('reference')&&<p className="mt-1 text-sm">Reference: {params.get('reference')}</p>}</div></div>}
  <section className="relative overflow-hidden bg-ink py-20 text-white"><div className="container-page grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
   <div><p className="mb-3 text-sm font-bold uppercase tracking-[.25em] text-gold">Tidori Ministries · Grace Pool</p><h1 className="mb-5 text-4xl font-bold leading-tight text-white sm:text-6xl">No one should have to grieve alone.</h1><p className="max-w-2xl text-lg leading-8 text-white/80">We connect compassionate hearts with people navigating grief who need confidential spiritual guidance and prayer, regardless of their ability to pay.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#sponsor" className="btn-custom btn-light">Sponsor a comfort journey</a><a href="#request" className="btn-custom border-white/60 text-white">Request confidential support</a></div></div>
   <div className="rounded-2xl border border-white/15 bg-white/10 p-7"><p className="text-sm uppercase tracking-widest text-gold">Our promise</p><h2 className="mt-3 text-2xl font-semibold text-white">Compassion without financial barriers.</h2><p className="mt-4 leading-7 text-white/75">Your gift helps make pastoral care available to someone carrying loss. Beneficiary identities and personal stories are never shared with sponsors.</p><p className="mt-5 text-sm text-white/65">Spiritual and pastoral support is not a substitute for professional mental-health or emergency care.</p></div>
  </div></section>
  <section className="container-page py-14"><SectionHeader kicker="The Grace Pool" title="A bridge built by many hands"/><div className="grid gap-4 sm:grid-cols-3">{[['Verified contributions',impact.contributions],['UGX received',money(impact.amount_ugx)],['USD received',money(impact.amount_usd,'USD')]].map(([label,value])=><div key={label} className="rounded-xl bg-mist p-6 text-center"><p className="text-3xl font-bold text-navy">{Number(value||0).toLocaleString()}</p><p className="mt-2 text-sm text-gray-600">{label}</p></div>)}</div><p className="mt-3 text-center text-xs text-gray-500">Public totals only. No donor or beneficiary identities are displayed.</p></section>
  <section className="bg-mist py-16"><div className="container-page"><SectionHeader kicker="How it works" title="From generosity to compassionate care"/><div className="grid gap-6 md:grid-cols-3">{[['01','Give what you can','Support the general Grace Pool or dedicate your contribution to a particular kind of loss.'],['02','We allocate support','Authorised pastoral coordinators match available funds with eligible requests.'],['03','Care is provided','The beneficiary receives confidential spiritual guidance, prayer covering or both.']].map(([n,t,d])=><article key={n} className="rounded-xl bg-white p-6 shadow-sm"><p className="text-3xl font-bold text-gold">{n}</p><h3 className="my-3 text-xl">{t}</h3><p className="leading-7 text-gray-600">{d}</p></article>)}</div></div></section>
  <section id="sponsor" className="container-page grid gap-10 py-16 lg:grid-cols-2"><div><SectionHeader center={false} kicker="Become a founding supporter" title="Help open the door before someone asks"/><p className="leading-7 text-gray-600">The launch goal is to fund the first five full comfort packages. A full package sponsors one confidential one-to-one spiritual guidance session and 14 days of Prayer Altar covering.</p><div className="mt-6 space-y-4">{[['Seed Gift','UGX 20,000 or more','Strengthens the shared Grace Pool.'],['14-Day Prayer Altar','UGX 75,000','Sponsors dedicated prayer covering for 14 days.'],['Full Comfort Package','UGX 150,000','One 1-on-1 spiritual guidance session plus 14 days of Prayer Altar covering.']].map(([t,v,d])=><div key={t} className="rounded-lg border border-gray-200 p-4"><div className="flex justify-between gap-3"><strong>{t}</strong><strong>{v}</strong></div><p className="mt-1 text-sm text-gray-600">{d}</p></div>)}</div><p className="mt-4 text-sm text-gray-500">Founding target: five full packages (UGX 750,000).</p></div><GiveForm dark programme="comfort_bridge" dedication="General Grace Pool"/></section>
  <section id="request" className="bg-mist py-16"><div className="container-page grid items-start gap-10 lg:grid-cols-2"><div><SectionHeader center={false} kicker="You are not alone" title="It is okay to ask for support"/><p className="leading-7 text-gray-600">You do not need to make a donation to request help. Applications are reviewed privately by authorised pastoral personnel. A request is not a guarantee of immediate availability; the team will contact you to discuss next steps.</p><p className="mt-4 text-sm text-gray-500">If you need urgent help, contact local emergency services or a qualified professional immediately.</p></div><SupportRequest/></div></section>
  <section className="container-page py-10 text-center"><h2 className="text-2xl">A quiet act of kindness can become someone's turning point.</h2><p className="mt-3 text-gray-600">Thank you for helping Tidori Ministries carry comfort beyond the walls of the church.</p><Link to="/give" className="mt-4 inline-block text-gold underline">Explore other ways to give</Link></section>
 </>;
}
