import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const tiers = [
  { code:'bronze', name:'Bronze', subtitle:'Spiritual care and group support', color:'#CD7F32', modes:['audio'], benefits:['Pastoral care','Prayer ministry','Grief support groups','Youth and family ministries','Parenting support groups','Financial classes'] },
  { code:'silver', name:'Silver', subtitle:'Guided counselling and personal growth', color:'#A7A9AC', modes:['audio','video'], benefits:['Everything in Bronze','Addiction recovery groups','Divorce recovery groups','Marriage and premarital counselling or classes','Parenting classes','Life coaching or mentoring','Financial counselling'] },
  { code:'gold', name:'Gold', subtitle:'Personalised and in-person ministry support', color:'#D4AF37', modes:['audio','video','in_person'], benefits:['Everything in Silver','Hospital and home visitation','Personalised marriage and family support','Personalised recovery support','Individual pastoral mentoring','Priority physical pastoral meetings'] },
];
const universalServices = [
  'Crisis support','Licensed therapist referrals','Benevolence or care ministries (meals, financial help, rides)','Emergency pastoral intervention',
];
const services = [
  'Pastoral care','Prayer ministry','Grief support groups','Addiction recovery groups','Divorce recovery groups',
  'Marriage and premarital counselling or classes','Parenting classes and support groups','Youth and family ministries',
  'Benevolence or care ministries (meals, financial help, rides)','Hospital and home visitation',
  'Licensed therapist referrals','Crisis support','Life coaching or mentoring','Financial counselling or classes',
];
const modeLabels = { audio:'Audio call', video:'Video call', in_person:'Physical meeting' };
const money = (amount,currency='UGX') => new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-UG', { style:'currency', currency, maximumFractionDigits:currency === 'UGX' ? 0 : 2 }).format(Number(amount||0));
const currencyLabel = currency => currency === 'USD' ? '🇺🇸 USD · US Dollar' : '🇺🇬 UGX · Ugandan Shilling';

export default function AppointmentForm() {
  const [form,setForm] = useState({ full_name:'', email:'', phone:'', service:'Pastoral care', package_tier:'bronze', meeting_mode:'audio', date:'', time:'', notes:'' });
  const [packages,setPackages] = useState([]);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const selectedPackage = useMemo(()=>packages.find(p=>p.tier_code===form.package_tier && p.is_active),[packages,form.package_tier]);
  const selectedTier = tiers.find(t=>t.code===form.package_tier) || tiers[0];
  const universal = universalServices.includes(form.service);
  const availableModes = universal ? ['audio','video','in_person'] : selectedTier.modes;
  const fee = universal ? 0 : Number(selectedPackage?.amount ?? 0);

  useEffect(()=>{
    let active=true;
    fetch('/api/appointments/fees',{cache:'no-store'})
      .then(r=>r.json()).then(data=>{if(active)setPackages(Array.isArray(data.packages)?data.packages:[]);})
      .catch(()=>{if(active)setPackages([]);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);

  const update = event => {
    const {name,value}=event.target;
    setForm(current=>{
      const next={...current,[name]:value};
      if(name==='package_tier' && !universalServices.includes(current.service)){
        const tier=tiers.find(item=>item.code===value);
        if(tier && !tier.modes.includes(current.meeting_mode)) next.meeting_mode=tier.modes[0];
      }
      if(name==='service' && universalServices.includes(value)) next.meeting_mode='audio';
      return next;
    });
  };

  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if(!supabase) throw new Error('The appointment service is not available right now.');
      const requestedAt=new Date(`${form.date}T${form.time}`);
      if(!Number.isFinite(requestedAt.getTime())||requestedAt.getTime()<Date.now()-60000) throw new Error('Please choose a future appointment date and time.');
      if(!universal && !selectedPackage) throw new Error('This appointment package is not available yet. Please contact the church office.');
      if(!availableModes.includes(form.meeting_mode)) throw new Error('Your selected package does not include that appointment mode.');
      const {data:sessionData}=await supabase.auth.getSession();
      const response=await fetch('/api/appointments/request',{
        method:'POST',
        headers:{'content-type':'application/json',...(sessionData?.session?.access_token?{authorization:`Bearer ${sessionData.session.access_token}`}:{})},
        body:JSON.stringify({
          full_name:form.full_name.trim(),email:form.email.trim(),phone:form.phone.trim(),
          appointment_type:form.service,service:form.service,package_tier:universal?null:form.package_tier,
          meeting_mode:form.meeting_mode,requested_at:requestedAt.toISOString(),notes:form.notes.trim(),
        }),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||'We could not submit your appointment request.');
      if(result.redirect_url){window.location.assign(result.redirect_url);return;}
      setMessage(result.free?'Your support request has been received. Tidori Ministries will contact you.':'Your appointment request has been received and is awaiting confirmation by the church team.');
      setForm({full_name:'',email:'',phone:'',service:'Pastoral care',package_tier:'bronze',meeting_mode:'audio',date:'',time:'',notes:''});
    } catch(err){setError(err.message||'We could not submit your appointment request. Please try again.');}
    finally{setBusy(false);}
  };

  return <section className="bg-mist p-5 sm:p-8">
    <div className="mb-6"><p className="mb-2 text-gold">Pastoral appointments</p><h2 className="text-2xl sm:text-3xl">Choose your appointment package</h2><p className="mt-2 text-sm leading-6 text-gray-600">Each package includes the benefits of the tier below it. Crisis support, emergency pastoral intervention, therapist referrals and needs-based benevolence remain available regardless of package.</p></div>
    <div className="mb-7 grid items-stretch gap-4 md:grid-cols-3">
      {tiers.map((tier,index)=>{
        const pkg=packages.find(p=>p.tier_code===tier.code&&p.is_active);
        const active=form.package_tier===tier.code;
        return <button key={tier.code} type="button" onClick={()=>setForm(v=>({...v,package_tier:tier.code,meeting_mode:tier.modes.includes(v.meeting_mode)?v.meeting_mode:tier.modes[0]}))}
          className={`relative flex h-full flex-col rounded-[24px] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${active?'ring-2 ring-offset-2':'border-gray-200'} ${index===1?'md:-translate-y-2 md:shadow-lg':''}`}
          style={{borderColor:active?tier.color:undefined,'--tw-ring-color':tier.color}}>
          {index===1&&<span className="absolute -top-3 right-5 rounded-full bg-[#191c24] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Popular</span>}
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black" style={{backgroundColor:tier.color+'22',color:tier.color}}>{tier.name.slice(0,1)}</span>
          <span className="text-xs font-bold uppercase tracking-[.18em]" style={{color:tier.color}}>Contribution to the Ministry</span>
          <span className="mt-2 inline-flex w-fit rounded-full bg-[#f4f1e8] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#6b5520]">{currencyLabel(pkg?.currency || 'UGX')}</span>
          <span className="mt-2 text-2xl font-semibold text-[#191c24]">{pkg?money(pkg.amount,pkg.currency):loading?'Loading…':'Price set by ministry'}</span>
          <span className="mt-1 text-xs text-gray-500">{tier.subtitle}</span>
          <span className="my-4 h-px w-full bg-gray-100"/>
          <span className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Included benefits</span>
          <ul className="space-y-2 text-xs leading-5 text-gray-700">{tier.benefits.map(item=><li key={item} className="flex gap-2"><span className="font-bold" style={{color:tier.color}}>✓</span><span>{item}</span></li>)}</ul>
          <span className="mt-5 rounded-xl py-2.5 text-center text-xs font-bold" style={{backgroundColor:active?tier.color:'#f3f4f6',color:active?'white':'#374151'}}>{active?'Selected package':'Choose package'}</span>
        </button>;
      })}
    </div>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Full name<input className="field mt-1" name="full_name" value={form.full_name} onChange={update} required maxLength={120}/></label>
      <label className="text-sm font-semibold">Phone number<input className="field mt-1" name="phone" type="tel" value={form.phone} onChange={update} maxLength={40} required/></label>
      <label className="text-sm font-semibold">Email address<input className="field mt-1" name="email" type="email" value={form.email} onChange={update} maxLength={200} required={!universal&&fee>0}/></label>
      <label className="text-sm font-semibold">Ministry service<select className="field mt-1" name="service" value={form.service} onChange={update}>{services.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="text-sm font-semibold">Appointment mode<select className="field mt-1" name="meeting_mode" value={form.meeting_mode} onChange={update}>{availableModes.map(mode=><option key={mode} value={mode}>{modeLabels[mode]}</option>)}</select></label>
      <label className="text-sm font-semibold">Preferred date<input className="field mt-1" type="date" name="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={update} required/></label>
      <label className="text-sm font-semibold">Preferred time<input className="field mt-1" type="time" name="time" value={form.time} onChange={update} required/></label>
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm sm:col-span-2">
        <span className="text-gray-500">{universal?'Support request':'Selected package fee'}</span>
        <strong className="ml-2 text-lg text-[#191c24]">{universal?'No package fee':selectedPackage?money(fee,selectedPackage.currency):'Not yet configured'}</strong>
        {!universal && selectedPackage && <span className="ml-2 inline-flex rounded-full bg-[#f4f1e8] px-2 py-1 text-[10px] font-bold text-[#6b5520]">{currencyLabel(selectedPackage.currency)}</span>}
        <p className="mt-1 text-xs text-gray-500">{universal?'This support is not restricted by paid package. The ministry will assess and coordinate the appropriate help.':selectedPackage?(fee>0?'Secure payment is completed through Pesapal after submitting.':'This package has been configured as free.'):'The ministry administrator must configure this package before booking.'}</p>
      </div>
      <label className="text-sm font-semibold sm:col-span-2">Additional details<textarea className="field mt-1 min-h-24" name="notes" value={form.notes} onChange={update} maxLength={2000} placeholder="Tell us briefly how the ministry can support you."/></label>
      {error&&<p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {message&&<p role="status" className="text-sm text-green-700 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button className="btn-custom" type="submit" disabled={busy||loading||(!universal&&!selectedPackage)}>{busy?'Processing…':!universal&&fee>0?'Request & pay securely':'Request appointment'}</button></div>
    </form>
  </section>;
}
