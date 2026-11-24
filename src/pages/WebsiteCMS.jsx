import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const emptySite = {
  name:'Tidori Ministries', shortName:'Tidori', logoUrl:'/img/grok_1793864104245.jpg', tagline:'', motto:'', registrationNumber:'', foundingDate:'', websiteUrl:'', postalAddress:'', address:'', phone:'', email:'',
  serviceTimes:'', videoUrl:'',
  social:{ facebook:'', twitter:'', youtube:'', instagram:'', linkedin:'' },
  about:{ about:'', history:'', mission:'', vision:'', beliefs:'', objectives:'', values:'', imageUrl:'/img/about.jpg' },
};
const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]';
const tabs = [
  ['identity','Identity & contact'],['about','About / mission / vision / values'],
  ['social','Social links & video'],['slides','Homepage slideshow'],
  ['ministries','Ministries'],['facts','Homepage statistics'],['events','Events'],['outreach','Outreach projects'],['posts','Blog & news'],['team','Church leaders'],
];

export default function WebsiteCMS() {
  const [tab,setTab] = useState('identity');
  const [site,setSite] = useState(emptySite);
  const [published,setPublished] = useState(true);
  const [slides,setSlides] = useState([]);
  const [ministries,setMinistries] = useState([]);
  const [facts,setFacts] = useState([]);
  const [events,setEvents] = useState([]);
  const [outreach,setOutreach] = useState([]);
  const [posts,setPosts] = useState([]);
  const [leaders,setLeaders] = useState([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [editing,setEditing] = useState(null);

  const load = async () => {
    setBusy(true); setError('');
    const results = await Promise.all([
      supabase.from('site_content').select('*').eq('id','main').maybeSingle(),
      supabase.from('homepage_slides').select('*').order('sort_order'),
      supabase.from('site_ministries').select('*').order('sort_order'),
      supabase.from('site_facts').select('*').order('sort_order'),
      supabase.from('events').select('*').order('starts_at',{ascending:false}),
      supabase.from('outreach_projects').select('*').order('sort_order'),
      supabase.from('posts').select('*').order('published_at',{ascending:false}),
      supabase.from('team_members').select('*').order('sort_order'),
    ]);
    const failed = results.find(r => r.error);
    if (failed) setError(failed.error.message);
    if (results[0].data?.content) setSite({...emptySite,...results[0].data.content, social:{...emptySite.social,...results[0].data.content.social}, about:{...emptySite.about,...results[0].data.content.about}});
    setPublished(results[0].data?.published ?? true);
    setSlides(results[1].data || []); setMinistries(results[2].data || []); setFacts(results[3].data || []);
    setEvents(results[4].data || []); setOutreach(results[5].data || []); setPosts(results[6].data || []); setLeaders(results[7].data || []);
    setBusy(false);
  };
  useEffect(()=>{load();},[]);

  const uploadImage = async (file, target, key) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Images must be 8 MB or smaller.'); return; }
    setBusy(true); setError(''); setNotice('');
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g,'-');
    const path = `${target}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('tidori-website').upload(path,file,{upsert:true,contentType:file.type});
    if (uploadError) setError(uploadError.message);
    else {
      const { data } = supabase.storage.from('tidori-website').getPublicUrl(path);
      if (target === 'site') setSite(v=>({...v,[key]:data.publicUrl}));
      else if (target === 'about') setSite(v=>({...v,about:{...v.about,[key]:data.publicUrl}}));
      else setEditing(v=>({...v,item:{...v.item,[key]:data.publicUrl}}));
      setNotice('Image uploaded. Save the record to apply the new image.');
    }
    setBusy(false);
  };

  const saveSite = async () => {
    setBusy(true); setError(''); setNotice('');
    const {data:userData} = await supabase.auth.getUser();
    const {error:saveError} = await supabase.from('site_content').upsert({id:'main',content:site,published,updated_at:new Date().toISOString(),updated_by:userData.user?.id || null});
    if (saveError) setError(saveError.message); else setNotice('Organisation and About-page information saved.');
    setBusy(false);
  };
  const saveItem = async (table,item) => {
    setBusy(true); setError(''); setNotice('');
    const payload = ['homepage_slides','site_ministries','site_facts'].includes(table) ? {...item,updated_at:new Date().toISOString()} : item;
    const {error:saveError} = await supabase.from(table).upsert(payload).select().single();
    if (saveError) setError(saveError.message);
    else {setNotice('Record saved.');setEditing(null);await load();}
    setBusy(false);
  };
  const removeItem = async (table,id) => {
    if(!window.confirm('Delete this record?')) return;
    const {error:removeError}=await supabase.from(table).delete().eq('id',id);
    if(removeError) setError(removeError.message); else {setNotice('Record deleted.');await load();}
  };
  const setField=(key,value)=>setSite(v=>({...v,[key]:value}));
  const setNested=(group,key,value)=>setSite(v=>({...v,[group]:{...v[group],[key]:value}}));
  const newItem = () => {
    if(tab==='slides') setEditing({table:'homepage_slides',item:{title:'',description:'',image_url:'',button_label:'Learn More',button_url:'/about',sort_order:slides.length,published:false}});
    if(tab==='ministries') setEditing({table:'site_ministries',item:{title:'',description:'',icon:'flaticon-social-care',image_url:'',page_url:'',sort_order:ministries.length,published:false}});
    if(tab==='facts') setEditing({table:'site_facts',item:{label:'',value:0,icon:'flaticon-home',sort_order:facts.length,published:false}});
    if(tab==='events') setEditing({table:'events',item:{title:'',description:'',image_url:'',location:'',starts_at:new Date().toISOString(),ends_at:null,published:false}});
    if(tab==='outreach') setEditing({table:'outreach_projects',item:{title:'',summary:'',image_url:'',goal_amount:0,raised_amount:0,sort_order:outreach.length,published:false}});
    if(tab==='posts') setEditing({table:'posts',item:{slug:'tidori-bursary-scholarship-programme',title:'Tidori Ministries Bursary and Scholarship Programme: How to Apply',excerpt:'Learn how to access the Tidori Ministries Bursary and Scholarship Programme, what information and documents to prepare, and how to submit an application through the official portal.',body:"Tidori Ministries Uganda believes that access to education can open doors, strengthen families and help communities build a better future. Through our Bursary and Scholarship Programme, we provide an opportunity for prospective learners and their guardians to submit their details for consideration under the programme.\n\nWHO CAN APPLY?\n\nThe programme is intended for applicants seeking educational support through Tidori Ministries. Applicants and guardians should read the current programme announcements and instructions carefully before starting an application. Any specific age limits, eligible classes or levels, academic cut-off marks, selection criteria and application deadlines will be communicated officially by Tidori Ministries. Please do not assume that submitting an application automatically qualifies an applicant for an award.\n\nHOW TO APPLY\n\n1. Create a Tidori member account or sign in to your existing account.\n2. Visit the Bursaries section of the official Tidori Ministries website.\n3. Follow the instructions displayed in the bursary application portal.\n4. Enter the applicant's personal details, the class or level being applied for, guardian contact information, previous school and academic results.\n5. Provide the requested school choices and the applicant's location details.\n6. Prepare the required supporting documents, including the National ID document and a passport-size photograph, in the file formats and sizes accepted by the portal.\n7. Review the information carefully before submitting the application and keep the application reference for your records.\n\nAPPLICATION FEE AND IMPORTANT INFORMATION\n\nThe bursary portal currently displays an application fee of UGX 11,000. Applicants should always confirm the current fee and payment instructions on the official Tidori Ministries website before making a payment. An application fee, where applicable, is an administrative application charge; it is not a promise or guarantee that an applicant will receive a bursary or scholarship.\n\nWHAT YOU SHOULD PREPARE\n\nApplicants should have accurate personal details, guardian contacts, academic results, previous school information, preferred school choices, location details and the supporting identity documents requested in the application portal. Ensure that names and other details are entered correctly and that uploaded documents are clear and legible.\n\nFAIRNESS, VERIFICATION AND COMMUNICATION\n\nAll applications are subject to the programme's review and verification process. Submission does not guarantee selection, admission to a school or financial support. Applicants should rely only on announcements and instructions published through official Tidori Ministries channels. Do not send money to individuals or use payment instructions that have not been confirmed by Tidori Ministries.\n\nSTART YOUR APPLICATION\n\nTo learn more and access the application portal, visit the Bursaries page on the official Tidori Ministries website. You will need to sign in to your Tidori account to continue.\n\nTidori Ministries Uganda\nTime to do right.",image_url:'',author:'Tidori Ministries',published_at:new Date().toISOString(),published:false,presentation:{category:'Ministry News',hero_style:'image',show_featured_image:true,show_excerpt:true,show_author:true,show_date:true,show_read_time:true,show_sidebar:true,sidebar_title:'Stay connected',sidebar_text:'Discover our ministries, upcoming events and ways to serve.',show_related:true,related_title:'More from Tidori',show_whatsapp:true,show_facebook:true,show_copy_link:true,content_width:'comfortable'}}});
    if(tab==='team') setEditing({table:'team_members',item:{name:'',role:'',photo_url:'',sort_order:leaders.length,published:false}});
  };
  const field=(label,key,value,onChange,type='text')=><label className="block text-xs font-semibold text-gray-600">{label}<input className={input+' mt-1'} type={type} value={value ?? ''} onChange={e=>onChange(key,type==='number'?Number(e.target.value):e.target.value)} /></label>;
  const editor=(table,items,fields)=> <section className="admin-card overflow-hidden">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">{({homepage_slides:'Homepage slides',site_ministries:'Ministries',site_facts:'Homepage statistics',events:'Events',outreach_projects:'Outreach projects',posts:'Blog & news',team_members:'Church leaders'})[table] || 'Website records'}</h2><p className="admin-muted mt-1">Only published records appear on the public website.</p></div><button onClick={newItem} className="rounded bg-[#009cff] px-3 py-2 text-sm font-semibold text-white">{tab==='posts'?'Prepare bursary article':'Add new'}</button></div>
    <div className="divide-y divide-gray-100">{items.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><strong className="block text-sm text-[#191c24]">{item.title||item.label||item.name}</strong><span className="text-xs text-gray-500">{item.description||('Value: '+(item.value??''))} · Order {item.sort_order}</span><span className={'ml-2 rounded-full px-2 py-1 text-[10px] font-semibold '+(item.published?'bg-emerald-50 text-emerald-700':'bg-gray-100 text-gray-600')}>{item.published?'Published':'Draft'}</span></div><div className="flex gap-2"><button onClick={()=>setEditing({table,item:{...item}})} className="rounded border px-3 py-1.5 text-xs font-semibold">Edit</button><button onClick={()=>removeItem(table,item.id)} className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Delete</button></div></div>)}{!items.length&&<p className="p-5 text-sm text-gray-500">No records yet. Add the first one.</p>}</div>
  </section>;

  return <div className="space-y-5">
    <section className="admin-card p-4">
      <div className="mb-3"><h2 className="admin-section-title">Website content management</h2><p className="admin-muted mt-1">Manage the content displayed on Tidori's public website. Save drafts and publish only when ready.</p></div>
      <div className="flex flex-wrap gap-2">{tabs.map(([id,label])=><button key={id} onClick={()=>{setTab(id);setEditing(null);setError('');setNotice('');}} className={'rounded-lg px-3 py-2 text-sm font-semibold '+(tab===id?'bg-[#009cff] text-white':'bg-gray-100 text-gray-600')}>{label}</button>)}</div>
      {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice&&<p role="status" className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    </section>
    {tab==='identity'&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">Organisation identity and contact information</h3><div className="grid gap-4 sm:grid-cols-2">
      {['name','shortName','logoUrl','tagline','motto','registrationNumber','foundingDate','websiteUrl','postalAddress','address','phone','email','serviceTimes','videoUrl'].map(key=>field(({name:'Ministry name',shortName:'Short name',logoUrl:'Logo image URL',tagline:'Tagline',motto:'Motto',registrationNumber:'Registration number',foundingDate:'Founding date',websiteUrl:'Official website',postalAddress:'Postal address',address:'Physical address',phone:'Telephone',email:'Public email',serviceTimes:'Service times',videoUrl:'Video URL'})[key],key,site[key],setField,key==='email'?'email':'text'))}
    </div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish organisation information on the website</label><label className="mt-4 block text-xs font-semibold text-gray-600">Upload ministry logo (PNG, JPG, WEBP; max 8 MB)<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-sm" onChange={e=>uploadImage(e.target.files?.[0],'site','logoUrl')} /></label><button disabled={busy} onClick={saveSite} className="mt-4 rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Save organisation details'}</button></section>}
    {tab==='about'&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">About, mission and vision</h3><div className="space-y-4">{[['about','About the ministry'],['history','History and background'],['mission','Mission statement'],['vision','Vision statement'],['beliefs','Statement of faith / beliefs'],['objectives','Aims and objectives'],['values','Core values']].map(([key,label])=><label key={key} className="block text-xs font-semibold text-gray-600">{label}<textarea rows="5" className={input+' mt-1'} value={site.about?.[key]||''} onChange={e=>setNested('about',key,e.target.value)}/></label>)}</div><label className="mt-4 block text-xs font-semibold text-gray-600">About-page image URL<input className={input+' mt-1'} value={site.about?.imageUrl||''} onChange={e=>setNested('about','imageUrl',e.target.value)}/><input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={e=>uploadImage(e.target.files?.[0],'about','imageUrl')}/></label><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish About information</label><button disabled={busy} onClick={saveSite} className="mt-4 rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">{busy?'Saving…':'Save About information'}</button></section>}
    {tab==='social'&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">Social media and homepage video</h3><div className="grid gap-4 sm:grid-cols-2">{Object.keys(site.social||{}).map(key=>field(key+' URL',key,site.social[key],(k,v)=>setNested('social',k,v)))}{field('Video URL','videoUrl',site.videoUrl,setField)}</div><button disabled={busy} onClick={saveSite} className="mt-4 rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">{busy?'Saving…':'Save social links'}</button></section>}
    {tab==='slides'&&editor('homepage_slides',slides)}
    {tab==='ministries'&&editor('site_ministries',ministries)}
    {tab==='facts'&&editor('site_facts',facts)}
    {tab==='events'&&editor('events',events)}
    {tab==='outreach'&&editor('outreach_projects',outreach)}
    {tab==='posts'&&editor('posts',posts)}
    {tab==='team'&&editor('team_members',leaders)}
    {editing&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">Edit {editing.table==='homepage_slides'?'homepage slide':editing.table==='site_ministries'?'ministry':editing.table==='site_facts'?'statistic':editing.table==='events'?'event':editing.table==='outreach_projects'?'outreach project':editing.table==='posts'?'post': 'church leader'}</h3><div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(editing.item).filter(([key])=>!['id','created_at','updated_at','presentation'].includes(key)).map(([key,value])=>key==='published'?<label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value)} onChange={e=>setEditing(v=>({...v,item:{...v.item,published:e.target.checked}}))}/> Published on website</label>:['description','summary','body','excerpt'].includes(key)?<label key={key} className="block text-xs font-semibold text-gray-600 sm:col-span-2">{key.replaceAll('_',' ')}<textarea rows={key==='body'?16:4} className={input+' mt-1'} value={value??''} onChange={e=>setEditing(v=>({...v,item:{...v.item,[key]:e.target.value}}))}/></label>:['image_url','photo_url'].includes(key)?<label key={key} className="block text-xs font-semibold text-gray-600">{key.replaceAll('_',' ')}<input className={input+' mt-1'} value={value??''} onChange={e=>setEditing(v=>({...v,item:{...v.item,[key]:e.target.value}}))}/><input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={e=>uploadImage(e.target.files?.[0],'records',key)}/></label>:<label key={key} className="block text-xs font-semibold text-gray-600">{key.replaceAll('_',' ')}<input className={input+' mt-1'} type={typeof value==='number'?'number':'text'} value={value??''} onChange={e=>setEditing(v=>({...v,item:{...v.item,[key]:typeof value==='number'?Number(e.target.value):e.target.value}}))}/></label>)}
    </div>{editing.table==='posts'&&<section className="mt-6 rounded-xl border border-[#e6eaf0] bg-[#f8fafc] p-4 sm:p-5">
      <div className="mb-4"><h4 className="text-base font-bold text-[#202b3b]">Article page design</h4><p className="mt-1 text-xs leading-5 text-gray-500">These settings control how this individual article appears on the public website. They are saved with the post, not built into the page code.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-gray-600">Category / label<input className={input+' mt-1'} value={editing.item.presentation?.category||''} placeholder="Ministry News" onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,category:e.target.value}}}))}/></label>
        <label className="block text-xs font-semibold text-gray-600">Hero appearance<select className={input+' mt-1'} value={editing.item.presentation?.hero_style||'image'} onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,hero_style:e.target.value}}}))}><option value="image">Large image with dark overlay</option><option value="compact">Compact title banner</option><option value="minimal">Minimal editorial header</option></select></label>
        <label className="block text-xs font-semibold text-gray-600">Article text width<select className={input+' mt-1'} value={editing.item.presentation?.content_width||'comfortable'} onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,content_width:e.target.value}}}))}><option value="narrow">Narrow – focused reading</option><option value="comfortable">Comfortable – recommended</option><option value="wide">Wide – more text space</option></select></label>
        <label className="block text-xs font-semibold text-gray-600">Related articles heading<input className={input+' mt-1'} value={editing.item.presentation?.related_title||'More from Tidori'} onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,related_title:e.target.value}}}))}/></label>
        <label className="block text-xs font-semibold text-gray-600 sm:col-span-2">Sidebar heading<input className={input+' mt-1'} value={editing.item.presentation?.sidebar_title||''} onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,sidebar_title:e.target.value}}}))}/></label>
        <label className="block text-xs font-semibold text-gray-600 sm:col-span-2">Sidebar message<textarea rows="3" className={input+' mt-1'} value={editing.item.presentation?.sidebar_text||''} onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,sidebar_text:e.target.value}}}))}/></label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['show_featured_image','Show featured image'],['show_excerpt','Show introduction / excerpt'],['show_author','Show author'],['show_date','Show publication date'],['show_read_time','Show reading time'],['show_sidebar','Show article sidebar'],['show_related','Show related articles'],['show_whatsapp','Enable WhatsApp sharing'],['show_facebook','Enable Facebook sharing'],['show_copy_link','Enable copy-link button']
        ].map(([key,label])=><label key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700"><input type="checkbox" checked={editing.item.presentation?.[key]!==false} onChange={e=>setEditing(v=>({...v,item:{...v.item,presentation:{...v.item.presentation,[key]:e.target.checked}}}))}/>{label}</label>)}
      </div>
    </section>}<div className="mt-4 flex gap-2"><button disabled={busy} onClick={()=>saveItem(editing.table,editing.item)} className="rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">Save record</button><button onClick={()=>setEditing(null)} className="rounded border px-5 py-2.5 text-sm">Cancel</button></div></section>}
    <div className="text-xs leading-5 text-gray-500">Publishing requires the Tidori administrator access policy. The public website reads only published content. Events, outreach projects, posts and leaders are managed here too; their existing page layouts remain unchanged. Keep personal records, donor details and internal notes out of these public content fields.</div>
  </div>;
}
