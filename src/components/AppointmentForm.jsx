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
const convertedAmount = (amount,from,to,usdToUgx) => {
  if (from === to) return Number(amount || 0);
  if (!usdToUgx) return null;
  return from === 'USD' && to === 'UGX' ? Number(amount || 0) * usdToUgx : Number(amount || 0) / usdToUgx;
};

export default function AppointmentForm() {
  const [form,setForm] = useState({ full_name:'', email:'', phone:'', service:'Pastoral care', package_tier:'bronze', meeting_mode:'audio', date:'', time:'', notes:'' });
  const [packages,setPackages] = useState([]);
  const [displayCurrency,setDisplayCurrency] = useState('UGX');
  const [usdToUgx,setUsdToUgx] = useState(null);
  const [rateLoading,setRateLoading] = useState(true);
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
    fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error('Exchange rate unavailable');return r.json();})
      .then(data=>{if(active&&data.result==='success'&&Number(data.rates?.UGX)>0)setUsdToUgx(Number(data.rates.UGX));})
      .catch(()=>{if(active)setUsdToUgx(null);})
      .finally(()=>{if(active)setRateLoading(false);});
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
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-bold text-[#191c24]">Display prices in</p><p className="text-xs text-gray-500">Choose the currency you are most comfortable with</p></div>
      <select aria-label="Display currency" className="field w-full sm:max-w-[230px]" value={displayCurrency} onChange={event=>setDisplayCurrency(event.target.value)}><option value="UGX">🇺🇬 UGX · Ugandan Shilling</option><option value="USD">🇺🇸 USD · US Dollar</option></select>
    </div>
    <div className="mb-7 -mx-4 grid grid-cols-1 items-stretch gap-4 sm:mx-0 sm:grid-cols-2 xl:grid-cols-3">
      {tiers.map((tier,index)=>{
        const pkg=packages.find(p=>p.tier_code===tier.code&&p.is_active);
        const active=form.package_tier===tier.code;
        return <button key={tier.code} type="button" onClick={()=>setForm(v=>({...v,package_tier:tier.code,meeting_mode:tier.modes.includes(v.meeting_mode)?v.meeting_mode:tier.modes[0]}))}
          className={`group relative flex h-full flex-col rounded-[34px] border-[3px] p-[7px] text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${active?'shadow-xl ring-2 ring-offset-2':'shadow-lg'} ${index===1?'md:-translate-y-3 md:hover:-translate-y-4':''}`}
          style={{borderColor:tier.color,background:index===1?'linear-gradient(145deg,#e8d38b 0%,#c9a84e 48%,#f5e7b2 100%)':'linear-gradient(145deg,#fffdf7 0%,#f1e6c7 100%)','--tw-ring-color':tier.color}}>
          <span className={`relative flex h-full flex-col overflow-hidden rounded-[27px] border ${index===1?'border-[#d8bd69] bg-[#202126] text-white':'border-[#eadfbf] bg-gradient-to-b from-[#fffefa] via-[#fffdf6] to-[#f7edcf] text-[#24242a]'}`}>
            {index===1&&<span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8f702b] via-[#f6df91] to-[#8f702b]"/>}
            {index===1&&<span className="absolute -right-10 top-7 rotate-45 bg-gradient-to-r from-[#d5b65e] via-[#f7e8ae] to-[#c49b37] px-12 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#302817] shadow-md">Popular</span>}
            <span className="flex items-center justify-between px-5 pb-2 pt-6 sm:px-6">
              <span className={`text-[10px] font-bold uppercase tracking-[.2em] ${index===1?'text-[#d9c17c]':'text-[#9b7b35]'}`}>Tidori Ministries</span>
              <span className={`rounded-full border px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.14em] ${index===1?'border-[#c9ad5c] text-[#ead79c]':'border-[#d9c58c] text-[#80652b]'}`}>{tier.name}</span>
            </span>
            <span className="px-5 pb-3 sm:px-6">
              <span className="block text-[25px] font-semibold leading-tight tracking-tight sm:text-[28px]">{tier.name}</span>
              <span className={`mt-1 block text-xs leading-5 ${index===1?'text-white/60':'text-gray-500'}`}>{tier.subtitle}</span>
            </span>
            <span className={`mx-4 rounded-[22px] border px-4 py-4 sm:mx-5 sm:px-5 ${index===1?'border-[#75643a] bg-[#17181c]':'border-[#e8dbb7] bg-white/75 shadow-inner'}`}>
              <span className={`block text-[9px] font-bold uppercase tracking-[.16em] ${index===1?'text-[#d8c27f]':'text-[#9b7b35]'}`}>{currencyLabel(displayCurrency)}</span>
              <span className={`mt-1 block break-words text-[27px] font-extrabold leading-tight tracking-tight sm:text-[32px] ${index===1?'text-[#f1d98d]':'text-[#24242a]'}`}>{pkg?(convertedAmount(pkg.amount,pkg.currency || 'UGX',displayCurrency,usdToUgx)===null?(rateLoading?'Loading exchange rate…':money(pkg.amount,pkg.currency || 'UGX')):money(convertedAmount(pkg.amount,pkg.currency || 'UGX',displayCurrency,usdToUgx),displayCurrency)):loading?'Loading…':'Price set by ministry'}</span>
              <span className={`mt-1 block text-[10px] ${index===1?'text-white/55':'text-gray-500'}`}>Contribution to the Ministry</span>
            </span>
            <span className="mx-5 my-4 h-px sm:mx-6" style={{background:index===1?'linear-gradient(90deg,transparent,#8f7942,transparent)':'linear-gradient(90deg,transparent,#d9c58c,transparent)'}}/>
            <span className={`px-5 pb-2 text-[10px] font-extrabold uppercase tracking-[.16em] sm:px-6 ${index===1?'text-[#d8c27f]':'text-[#8c7136]'}`}>Included benefits</span>
            <ul className={`flex-1 px-5 pb-5 text-xs leading-5 sm:px-6 ${index===1?'text-white/85':'text-gray-700'}`}>{tier.benefits.map((item,benefitIndex)=><li key={item} className={`flex items-start gap-2.5 border-t border-dotted py-3 ${benefitIndex===0?'border-transparent':index===1?'border-white/25':'border-[#d9c58c]'}`}><span className="mt-0.5 inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#62a91d] text-[10px] font-black text-white shadow-sm">✓</span><span>{item}</span></li>)}</ul>
            <span className={`mx-4 mb-4 rounded-full border py-3 text-center text-[11px] font-extrabold tracking-wide transition sm:mx-5 ${active?(index===1?'border-[#e6d18e] bg-[#e6d18e] text-[#242126]':'border-[#9b7b35] bg-[#9b7b35] text-white'):(index===1?'border-white/25 bg-white/5 text-white':'border-[#d8c58f] bg-white/60 text-[#705a2b]')}`}>{active?'Selected package':'Choose package'}</span>
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-[7px] z-20 h-auto w-auto">
              <path d="M 12 2 H 69 C 77 2 78 10 78 16 C 78 22 83 23 90 23 H 96 V 90 Q 96 98 88 98 H 12 Q 4 98 4 90 V 10 Q 4 2 12 2 Z" fill="none" stroke={index===1?"#a58c50":"#d8c99f"} strokeWidth="0.65" vectorEffect="non-scaling-stroke" opacity={index===1?"0.72":"0.9"}/>
            </svg>
          </span>
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
        <strong className="ml-2 text-lg text-[#191c24]">{universal?'No package fee':selectedPackage?(convertedAmount(fee,selectedPackage.currency || 'UGX',displayCurrency,usdToUgx)===null?money(fee,selectedPackage.currency):money(convertedAmount(fee,selectedPackage.currency || 'UGX',displayCurrency,usdToUgx),displayCurrency)):'Not yet configured'}</strong>
        {!universal && selectedPackage && <span className="ml-2 inline-flex rounded-full bg-[#f4f1e8] px-2 py-1 text-[10px] font-bold text-[#6b5520]">{currencyLabel(displayCurrency)}</span>}
        <p className="mt-1 text-xs text-gray-500">{universal?'This support is not restricted by paid package. The ministry will assess and coordinate the appropriate help.':selectedPackage?(fee>0?'Payment will be processed in the package currency configured by the ministry through Pesapal. The selector changes the displayed equivalent only.':'This package has been configured as free.'):'The ministry administrator must configure this package before booking.'}</p>
      </div>
      <label className="text-sm font-semibold sm:col-span-2">Additional details<textarea className="field mt-1 min-h-24" name="notes" value={form.notes} onChange={update} maxLength={2000} placeholder="Tell us briefly how the ministry can support you."/></label>
      {error&&<p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {message&&<p role="status" className="text-sm text-green-700 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button className="btn-custom" type="submit" disabled={busy||loading||(!universal&&!selectedPackage)}>{busy?'Processing…':!universal&&fee>0?'Request & pay securely':'Request appointment'}</button></div>
    </form>
  </section>;
}
