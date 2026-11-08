import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { supabase, supabaseReady } from '../lib/supabase';

const LOCATION_API = 'https://data.mnwll.tech/api';
const empty = { applicant_name:'', class_applied_for:'', level_applied_for:'', guardian_name:'', guardian_contact:'', guardian_email:'', region:'', district:'', county:'', subcounty:'', parish:'', village:'', former_school:'', stipulated_results:'', first_choice:'', option_one:'', option_two:'', national_id_number:'' };
const unwrap = value => Array.isArray(value) ? value : value?.data || value?.items || value?.results || [];
const labelOf = item => item?.name?.en || item?.name?.local || item?.name || item?.label || '';
const idOf = item => item?.id || item?.code || item?.slug || labelOf(item);

function LocationSelect({label,value,items,disabled,onChange}) {
  return <label className="block text-sm font-semibold text-navy">{label}
    <select className="field mt-2" value={value} disabled={disabled} required onChange={e=>onChange(e.target.value)}>
      <option value="">Select {label.toLowerCase()}</option>{items.map(item=><option key={idOf(item)} value={idOf(item)}>{labelOf(item)}</option>)}
    </select>
  </label>;
}

export default function Bursaries() {
  const [params] = useSearchParams();
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [rows,setRows] = useState([]);
  const [form,setForm] = useState(empty);
  const [selected,setSelected] = useState('');
  const [busy,setBusy] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [checkout,setCheckout] = useState('');
  const [regions,setRegions] = useState([]);
  const [districts,setDistricts] = useState([]);
  const [counties,setCounties] = useState([]);
  const [subcounties,setSubcounties] = useState([]);
  const [parishes,setParishes] = useState([]);
  const [villages,setVillages] = useState([]);
  const [locBusy,setLocBusy] = useState(false);
  const [results,setResults] = useState([]);

  const set = (key,value) => setForm(current=>({...current,[key]:value}));
  const token = async () => {
    const {data} = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error('Please sign in to continue.');
    return data.session.access_token;
  };
  const api = async (url, options={}) => {
    const access = await token();
    const response = await fetch(url,{...options,headers:{...(options.headers||{}),authorization:'Bearer '+access,'content-type':'application/json'}});
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  };
  const loadApplications = async () => {
    const data = await api('/api/bursary/applications');
    setRows(data.applications || []);
  };

  useEffect(()=>{
    let active=true;
    (async()=>{
      try {
        if(!supabaseReady) throw new Error('Tidori account services are unavailable.');
        const {data,error:authError}=await supabase.auth.getUser();
        if(authError || !data.user) { window.location.assign('/login?next=%2Fbursaries'); return; }
        if(!active) return;
        setUser(data.user);
        const {data:account}=await supabase.from('profiles').select('full_name,email,phone').eq('id',data.user.id).maybeSingle();
        setProfile(account || {});
        setForm(f=>({...f,applicant_name:account?.full_name || data.user.user_metadata?.full_name || ''}));
        const regionsResponse=await fetch(LOCATION_API+'/regions');
        if(!regionsResponse.ok) throw new Error('Uganda location directory is temporarily unavailable.');
        setRegions(unwrap(await regionsResponse.json()));
        await loadApplications();
      } catch(e){if(active)setError(e.message);}
      finally{if(active)setBusy(false);}
    })();
    return()=>{active=false;};
  },[]);

  useEffect(()=>{if(!form.region)return;let active=true;setLocBusy(true);setDistricts([]);setCounties([]);setSubcounties([]);setParishes([]);setVillages([]);set(['district','county','subcounty','parish','village'].join(''), '');
    fetch(LOCATION_API+'/districts?regionId='+encodeURIComponent(form.region)).then(r=>r.json()).then(d=>{if(active)setDistricts(unwrap(d));}).catch(()=>setError('Could not load districts for the selected region.')).finally(()=>{if(active)setLocBusy(false);});
    return()=>{active=false;};
  },[form.region]);
  useEffect(()=>{if(!form.district)return;let active=true;setCounties([]);setSubcounties([]);setParishes([]);setVillages([]);set('county','');set('subcounty','');set('parish','');set('village','');
    fetch(LOCATION_API+'/districts/'+encodeURIComponent(form.district)+'/counties').then(r=>r.json()).then(d=>{if(active)setCounties(unwrap(d));}).catch(()=>setError('Could not load counties.'));return()=>{active=false;};
  },[form.district]);
  useEffect(()=>{if(!form.county)return;let active=true;setSubcounties([]);setParishes([]);setVillages([]);set('subcounty','');set('parish','');set('village','');
    fetch(LOCATION_API+'/counties/'+encodeURIComponent(form.county)+'/subcounties').then(r=>r.json()).then(d=>{if(active)setSubcounties(unwrap(d));}).catch(()=>setError('Could not load sub-counties.'));return()=>{active=false;};
  },[form.county]);
  useEffect(()=>{if(!form.subcounty)return;let active=true;setParishes([]);setVillages([]);set('parish','');set('village','');
    fetch(LOCATION_API+'/subcounties/'+encodeURIComponent(form.subcounty)+'/parishes').then(r=>r.json()).then(d=>{if(active)setParishes(unwrap(d));}).catch(()=>setError('Could not load parishes.'));return()=>{active=false;};
  },[form.subcounty]);
  useEffect(()=>{if(!form.parish)return;let active=true;setVillages([]);set('village','');
    fetch(LOCATION_API+'/units?level=village&parishId='+encodeURIComponent(form.parish)+'&limit=1000').then(r=>r.json()).then(d=>{if(active)setVillages(unwrap(d));}).catch(()=>setError('Could not load villages.'));return()=>{active=false;};
  },[form.parish]);

  const paidRows=rows.filter(r=>r.payment_status==='paid');
  const unpaidRows=rows.filter(r=>r.payment_status!=='paid');
  const application=rows.find(r=>r.id===selected) || paidRows[0];
  const update=async e=>{
    e.preventDefault();if(!application)return;setSaving(true);setError('');setNotice('');
    try{const data=await api('/api/bursary/applications',{method:'POST',body:JSON.stringify({...form,application_id:application.id})});setNotice('Your bursary application has been submitted successfully.');setResults(data.application?[data.application]:[]);await loadApplications();}
    catch(e){setError(e.message);}finally{setSaving(false);}
  };
  const pay=async()=>{
    setError('');setNotice('');
    try{const data=await api('/api/bursary/payment',{method:'POST',body:JSON.stringify({name:form.applicant_name,email:profile?.email||user?.email,phone:profile?.phone||''})});setCheckout(data.redirect_url);window.location.href=data.redirect_url;}
    catch(e){setError(e.message);}
  };
  const photoQr=application?.application_serial ? 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data='+encodeURIComponent('https://tidori-ministries.grobaltechtechnologies.workers.dev/bursaries/verify/'+application.application_serial) : '';
  const barcode=application?.application_serial ? 'https://bwipjs-api.metafloor.com/?bcid=code128&text='+encodeURIComponent(application.application_serial)+'&scale=2&height=10&includetext' : '';
  if(busy)return <div className="container-page py-20 text-center">Loading your bursary portal…</div>;
  return <>
    <PageHeader title="Bursary and Scholarship Programme"/>
    <section className="container-page max-w-5xl py-10">
      <div className="mb-8 rounded-xl bg-ink p-6 text-white"><p className="text-sm uppercase tracking-widest text-gold">Tidori Ministries Uganda</p><h1 className="mt-2 text-3xl">Bursary & Scholarship Programme</h1><p className="mt-3 text-white/80">Applications are available to signed-in applicants after successful payment verification.</p><p className="mt-4 text-2xl font-bold text-gold">UGX 11,000 <span className="text-sm font-normal text-white">application fee</span></p></div>
      {error&&<p role="alert" className="mb-5 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {notice&&<p role="status" className="mb-5 rounded bg-green-50 p-3 text-green-800">{notice}</p>}
      {params.get('payment')==='cancelled'&&<p className="mb-5 rounded bg-yellow-50 p-3 text-yellow-900">Checkout was cancelled. Your application remains locked until payment is completed.</p>}
      {!paidRows.length ? <div className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Unlock your application form</h2><p className="mt-2 text-gray-600">Sign in with your Tidori account, then pay the fixed application fee. The form unlocks only after Pesapal confirms payment.</p><button type="button" className="btn-custom mt-5" onClick={pay}>Pay UGX 11,000 with Pesapal</button>{unpaidRows.length>0&&<p className="mt-3 text-sm text-amber-700">You have a payment awaiting confirmation. Please do not pay again; refresh this page shortly or contact Tidori if it remains pending.</p>}</div> : <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Your application</h2><span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">Payment verified</span></div>
        {paidRows.length>1&&<label className="mb-5 block text-sm font-semibold">Choose application<select className="field mt-2" value={selected||paidRows[0].id} onChange={e=>setSelected(e.target.value)}>{paidRows.map(r=><option key={r.id} value={r.id}>{r.application_serial||r.merchant_reference} — {r.application_status}</option>)}</select></label>}
        {application?.application_status==='submitted' ? <div className="rounded-xl border bg-white p-6"><h3 className="text-xl font-semibold">Application submitted</h3><p className="mt-2 text-gray-600">Your application has been received. Keep your serial number for follow-up.</p><p className="mt-3 font-semibold">{application.application_serial}</p><button className="btn-custom mt-4" onClick={()=>window.print()}>Print application receipt</button></div> :
        <form onSubmit={update} className="rounded-xl border bg-white p-5 sm:p-8">
          <div className="mb-6 grid grid-cols-[1fr_auto] items-start gap-4 border-b pb-5"><div><h2 className="text-center text-xl font-bold uppercase">Tidori Ministries Uganda</h2><p className="text-center text-sm">Bursary and Scholarship Programme</p><h3 className="mt-4 text-center font-bold underline">BURSARY APPLICATION FORM</h3></div><div className="h-28 w-24 border border-gray-400 p-1 text-center text-xs text-gray-500">Passport photo</div></div>
          <div className="mb-5 flex flex-wrap items-center gap-4"><img src={photoQr||'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Tidori+Bursary'} alt="Application QR code" className="h-24 w-24"/><div><p className="font-semibold">Application serial</p><p>{application?.application_serial||'Assigned after payment confirmation'}</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['applicant_name','class_applied_for','level_applied_for','guardian_name','guardian_contact','guardian_email','former_school','first_choice','option_one','option_two','national_id_number'].map(key=><label key={key} className="block text-sm font-semibold text-navy">{({applicant_name:'Applicant full name',class_applied_for:'Class applied for',level_applied_for:'Level applied for',guardian_name:'Guardian name',guardian_contact:'Guardian contact',guardian_email:'Guardian email',former_school:'Former school',first_choice:'First school choice',option_one:'School option one',option_two:'School option two',national_id_number:'National Identification Number (NIN)'})[key]}<input className="field mt-2" required value={form[key]} onChange={e=>set(key,e.target.value)} maxLength={key==='national_id_number'?20:160}/></label>)}
          </div>
          <label className="mt-4 block text-sm font-semibold text-navy">Stipulated academic results<textarea className="field mt-2" rows="4" required value={form.stipulated_results} onChange={e=>set('stipulated_results',e.target.value)}/></label>
          <div className="mt-7 border-t pt-5"><h3 className="mb-4 text-lg font-semibold">Applicant location — Uganda administrative areas</h3><div className="grid gap-4 sm:grid-cols-2">
            <LocationSelect label="Region" value={form.region} items={regions} onChange={v=>set('region',v)}/>
            <LocationSelect label="District / City" value={form.district} items={districts} disabled={!form.region||locBusy} onChange={v=>set('district',v)}/>
            <LocationSelect label="County / Municipality" value={form.county} items={counties} disabled={!form.district} onChange={v=>set('county',v)}/>
            <LocationSelect label="Sub-county / Town Council / Division" value={form.subcounty} items={subcounties} disabled={!form.county} onChange={v=>set('subcounty',v)}/>
            <LocationSelect label="Parish / Ward" value={form.parish} items={parishes} disabled={!form.subcounty} onChange={v=>set('parish',v)}/>
            <LocationSelect label="Village / Cell" value={form.village} items={villages} disabled={!form.parish} onChange={v=>set('village',v)}/>
          </div><p className="mt-2 text-xs text-gray-500">Dropdowns are populated hierarchically from the Uganda administrative location directory. Urban areas use their corresponding divisions, wards and cells.</p></div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5"><p className="text-xs text-gray-500">Your National ID details are collected only for bursary applicant verification.</p><button className="btn-custom" disabled={saving}>{saving?'Submitting…':'Submit bursary application'}</button></div>
          {application?.application_serial&&<div className="mt-8 flex flex-col items-center border-t pt-5"><img src={barcode} alt="Application serial barcode" className="max-w-full"/><p className="mt-2 italic">Time to do right</p></div>}
        </form>}
      </>}
      <p className="mt-8 text-sm text-gray-500">Need an account? <Link to="/register" className="underline">Register here</Link>. Already registered? <Link to="/login" className="underline">Sign in</Link>.</p>
    </section>
  </>;
}
