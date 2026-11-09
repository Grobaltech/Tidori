import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import LocationPicker from '../components/LocationPicker';
import IdentityOcrScanner from '../components/IdentityOcrScanner';
import { supabase, supabaseReady } from '../lib/supabase';

const empty = { applicant_name:'', class_applied_for:'', level_applied_for:'', guardian_name:'', guardian_contact:'', guardian_email:'', region:'', district:'', county:'', subcounty:'', parish:'', village:'', former_school:'', stipulated_results:'', first_choice:'', option_one:'', option_two:'', national_id_number:'' };
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
  const [checkoutReference,setCheckoutReference] = useState('');
  const [results,setResults] = useState([]);
  const [nationalIdFile,setNationalIdFile] = useState(null);
  const [passportFile,setPassportFile] = useState(null);

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
        await loadApplications();
      } catch(e){if(active)setError(e.message);}
      finally{if(active)setBusy(false);}
    })();
    return()=>{active=false;};
  },[]);

  const paidRows=rows.filter(r=>r.payment_status==='paid');
  const unpaidRows=rows.filter(r=>r.payment_status!=='paid');
  const pendingRows=rows.filter(r=>r.payment_status==='pending');
  const application=rows.find(r=>r.id===selected) || paidRows[0] || rows.find(r=>r.application_status==='draft') || rows[0];
  const update=async e=>{
    e.preventDefault();if(!application)return;setSaving(true);setError('');setNotice('');
    try{
      const uploadPrivate = async (file, label) => {
        if (!file) return null;
        if (!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type) || file.size > 10*1024*1024) throw new Error(label+' must be JPG, PNG, WebP or PDF and no larger than 10 MB.');
        const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
        const path = user.id+'/'+application.id+'/'+label+'-'+Date.now()+'.'+ext;
        const {error:uploadError}=await supabase.storage.from('bursary-private').upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError) throw uploadError;
        return path;
      };
      const [national_id_document_path,passport_photo_path]=await Promise.all([
        uploadPrivate(nationalIdFile,'national-id'),uploadPrivate(passportFile,'passport-photo')
      ]);
      const data=await api('/api/bursary/applications',{method:'POST',body:JSON.stringify({...form,application_id:application.id,national_id_document_path,passport_photo_path})});setNotice('Your bursary application has been submitted successfully.');setResults(data.application?[data.application]:[]);await loadApplications();}
    catch(e){setError(e.message);}finally{setSaving(false);}
  };
  const pay=async()=>{
    setError('');setNotice('');
    try{const data=await api('/api/bursary/payment',{method:'POST',body:JSON.stringify({name:form.applicant_name,email:profile?.email||user?.email,phone:profile?.phone||''})});setCheckout(data.redirect_url);setCheckoutReference(data.reference||'');}
    catch(e){setError(e.message);}
  };
  const photoQr=application?.application_serial ? 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data='+encodeURIComponent('https://tidori-ministries.grobaltechtechnologies.workers.dev/bursaries/verify/'+application.application_serial) : '';
  const barcode=application?.application_serial ? 'https://bwipjs-api.metafloor.com/?bcid=code128&text='+encodeURIComponent(application.application_serial)+'&scale=2&height=10&includetext' : '';
  if(busy)return <div className="container-page py-20 text-center">Loading your bursary portal…</div>;
  return <>
    <PageHeader title="Bursary and Scholarship Programme"/>
    <section className="container-page max-w-5xl py-10">
      <div className="mb-8 rounded-xl bg-ink p-6 text-white"><p className="text-sm uppercase tracking-widest text-gold">Tidori Ministries Uganda</p><h1 className="mt-2 text-3xl">Bursary & Scholarship Programme</h1><p className="mt-3 text-white/80">Signed-in applicants can now complete the form while payment verification is being restored.</p><p className="mt-4 text-2xl font-bold text-gold">UGX 11,000 <span className="text-sm font-normal text-white">application fee</span></p></div>
      {error&&<p role="alert" className="mb-5 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {notice&&<p role="status" className="mb-5 rounded bg-green-50 p-3 text-green-800">{notice}</p>}
      {params.get('payment')==='cancelled'&&<p className="mb-5 rounded bg-yellow-50 p-3 text-yellow-900">Checkout was cancelled. Your saved application remains available; payment can be completed once verification is restored.</p>}
      {!application || (application.payment_status!=='paid' && application.application_status!=='draft' && application.application_status!=='submitted') ? <div className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Bursary application access</h2><p className="mt-2 text-gray-600">The application form is temporarily being made available while we resolve Pesapal payment verification. Please refresh this page to create or reopen your draft.</p>{checkout ? <div className="mt-6 rounded-xl bg-mist p-4 sm:p-6" aria-label="Secure Pesapal checkout">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-ink">Complete your bursary application payment</h3><p className="text-sm text-ink/70">Secure payment powered by Pesapal. You are still on Tidori Ministries.</p></div><button type="button" className="btn-custom !px-4" onClick={()=>setCheckout('')}>Back</button></div>
          <iframe title="Pesapal secure payment" src={checkout} className="block w-full rounded-lg bg-white" style={{height:'min(780px, 78vh)',minHeight:'560px',border:0}} allow="payment *" referrerPolicy="strict-origin-when-cross-origin"/>
          <p className="mt-3 text-xs text-ink/65">If the payment window does not load, <a className="underline" href={checkout} target="_blank" rel="noopener noreferrer">open secure checkout in a new tab</a>.{checkoutReference ? ' Reference: '+checkoutReference : ''}</p>
        </div> : pendingRows.length ? <button type="button" className="btn-custom mt-5" onClick={loadApplications}>Refresh payment status</button> : <button type="button" className="btn-custom mt-5" onClick={pay}>Pay UGX 11,000 with Pesapal</button>}{!checkout&&pendingRows.length>0&&<p className="mt-3 text-sm text-amber-700">You have a payment awaiting confirmation. A second checkout is blocked while this payment is pending.</p>}</div> : <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Your application</h2><span className={"rounded-full px-3 py-1 text-sm "+(application.payment_status==='paid'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800')}>{application.payment_status==='paid'?'Payment verified':'Temporary form access · payment pending'}</span></div>
        {paidRows.length>1&&<label className="mb-5 block text-sm font-semibold">Choose application<select className="field mt-2" value={selected||paidRows[0].id} onChange={e=>setSelected(e.target.value)}>{paidRows.map(r=><option key={r.id} value={r.id}>{r.application_serial||r.merchant_reference} — {r.application_status}</option>)}</select></label>}
        {application?.application_status==='submitted' ? <div className="rounded-xl border bg-white p-6" id="bursary-print">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b-2 border-ink pb-4">
            <img src={photoQr} alt="Application verification QR" className="h-20 w-20"/>
            <div className="text-center"><h2 className="text-xl font-bold uppercase">Tidori Ministries Uganda</h2><p className="text-sm">Bursary and Scholarship Programme</p><h3 className="mt-2 font-bold underline">BURSARY APPLICATION FORM</h3></div>
            <div className="flex h-24 w-20 items-center justify-center border text-center text-xs">Passport photo<br/>on file</div>
          </div>
          <p className="mt-4 text-center text-sm font-semibold">Application serial: {application.application_serial}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {['applicant_name','class_applied_for','level_applied_for','guardian_name','guardian_contact','guardian_email','region','district','county','subcounty','parish','village','former_school','stipulated_results','first_choice','option_one','option_two','national_id_number'].map(key=><div key={key} className="border-b border-dotted py-2"><p className="text-xs uppercase text-gray-500">{key.replaceAll('_',' ')}</p><p className="whitespace-pre-wrap text-sm">{application[key]||'—'}</p></div>)}
          </div>
          <div className="mt-6 flex flex-col items-center border-t pt-4"><img src={barcode} alt="Application serial barcode" className="max-w-full"/><p className="mt-2 italic">Time to do right</p></div>
          <p className="mt-4 text-sm text-green-800">Your application has been submitted successfully. {application.payment_status==='paid'?'Payment of UGX 11,000 is verified.':'Your application is saved. Payment is still pending and will be reconciled separately.'}</p>
          <button className="btn-custom mt-4 print:hidden" onClick={()=>window.print()}>Print / Save as PDF</button>
        </div> :
        <form onSubmit={update} className="rounded-xl border bg-white p-5 sm:p-8">
          <div className="mb-6 grid grid-cols-[1fr_auto] items-start gap-4 border-b pb-5"><div><h2 className="text-center text-xl font-bold uppercase">Tidori Ministries Uganda</h2><p className="text-center text-sm">Bursary and Scholarship Programme</p><h3 className="mt-4 text-center font-bold underline">BURSARY APPLICATION FORM</h3></div><div className="h-28 w-24 border border-gray-400 p-1 text-center text-xs text-gray-500">Passport photo</div></div>
          <div className="mb-5 flex flex-wrap items-center gap-4"><img src={photoQr||'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Tidori+Bursary'} alt="Application QR code" className="h-24 w-24"/><div><p className="font-semibold">Application serial</p><p>{application?.application_serial||'Assigned after payment confirmation'}</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['applicant_name','class_applied_for','level_applied_for','guardian_name','guardian_contact','guardian_email','former_school','first_choice','option_one','option_two','national_id_number'].map(key=><label key={key} className="block text-sm font-semibold text-navy">{({applicant_name:'Applicant full name',class_applied_for:'Class applied for',level_applied_for:'Level applied for',guardian_name:'Guardian name',guardian_contact:'Guardian contact',guardian_email:'Guardian email',former_school:'Former school',first_choice:'First school choice',option_one:'School option one',option_two:'School option two',national_id_number:'National Identification Number (NIN)'})[key]}<input className="field mt-2" required value={form[key]} onChange={e=>set(key,e.target.value)} maxLength={key==='national_id_number'?20:160}/></label>)}
          </div>
          <div className="my-6"><IdentityOcrScanner nin={form.national_id_number} onNinChange={value=>set('national_id_number',value)} title="Applicant identity document checks" description="Enter the applicant’s NIN and card number, then capture the ID front, angled security-feature views and microprint close-up. Images and OCR stay on this device; upload the required document copy below separately." /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-navy">National ID copy (front or PDF)<input className="field mt-2" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={e=>setNationalIdFile(e.target.files?.[0]||null)}/><span className="mt-1 block text-xs font-normal text-gray-500">Private upload, maximum 10 MB.</span></label>
            <label className="block text-sm font-semibold text-navy">Passport-size applicant photograph<input className="field mt-2" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setPassportFile(e.target.files?.[0]||null)}/><span className="mt-1 block text-xs font-normal text-gray-500">JPG, PNG or WebP, maximum 10 MB.</span></label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-navy">Stipulated academic results<textarea className="field mt-2" rows="4" required value={form.stipulated_results} onChange={e=>set('stipulated_results',e.target.value)}/></label>
          <div className="mt-7 border-t pt-5"><h3 className="mb-4 text-lg font-semibold">Applicant location — Uganda administrative areas</h3><LocationPicker value={form} onChange={next=>setForm(current=>({...current,...next}))}/></div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5"><p className="text-xs text-gray-500">Your National ID details are collected only for bursary applicant verification.</p><button className="btn-custom" disabled={saving}>{saving?'Submitting…':'Submit bursary application'}</button></div>
          {application?.application_serial&&<>
            <section className="mt-6 border-t pt-4"><h3 className="font-bold uppercase">Official use only</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><p className="border-b border-dotted py-2">Name of staff: ______________________________</p><p className="border-b border-dotted py-2">Staff identification No.: _____________________</p></div></section>
            <div className="mt-8 flex flex-col items-center border-t pt-5"><img src={barcode} alt="Application serial barcode" className="max-w-full"/><p className="mt-2 italic">Time to do right</p></div>
          </>}
        </form>}
      </>}
      <p className="mt-8 text-sm text-gray-500">Need an account? <Link to="/register" className="underline">Register here</Link>. Already registered? <Link to="/login" className="underline">Sign in</Link>.</p>
    </section>
  </>;
}
