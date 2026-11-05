import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const emptySite = {
  name:'Tidori Ministries', shortName:'Tidori', logoUrl:'/img/grok_1793864104245.jpg', tagline:'', motto:'', registrationNumber:'', foundingDate:'', websiteUrl:'', postalAddress:'', address:'', phone:'', email:'',
  serviceTimes:'', videoUrl:'',
  social:{ facebook:'', twitter:'', youtube:'', instagram:'', linkedin:'' },
  about:{ about:'', history:'', mission:'', vision:'', beliefs:'', objectives:'', values:'' },
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
    if(tab==='posts') setEditing({table:'posts',item:{slug:'',title:'',excerpt:'',body:'',image_url:'',author:'Tidori Ministries',published_at:new Date().toISOString(),published:false}});
    if(tab==='team') setEditing({table:'team_members',item:{name:'',role:'',photo_url:'',sort_order:leaders.length,published:false}});
  };
  const field=(label,key,value,onChange,type='text')=><label className="block text-xs font-semibold text-gray-600">{label}<input className={input+' mt-1'} type={type} value={value ?? ''} onChange={e=>onChange(key,type==='number'?Number(e.target.value):e.target.value)} /></label>;
  const editor=(table,items,fields)=> <section className="admin-card overflow-hidden">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">{({homepage_slides:'Homepage slides',site_ministries:'Ministries',site_facts:'Homepage statistics',events:'Events',outreach_projects:'Outreach projects',posts:'Blog & news',team_members:'Church leaders'})[table] || 'Website records'}</h2><p className="admin-muted mt-1">Only published records appear on the public website.</p></div><button onClick={newItem} className="rounded bg-[#009cff] px-3 py-2 text-sm font-semibold text-white">Add new</button></div>
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
    </div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish organisation information on the website</label><button disabled={busy} onClick={saveSite} className="mt-4 rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Save organisation details'}</button></section>}
    {tab==='about'&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">About, mission and vision</h3><div className="space-y-4">{[['about','About the ministry'],['history','History and background'],['mission','Mission statement'],['vision','Vision statement'],['beliefs','Statement of faith / beliefs'],['objectives','Aims and objectives'],['values','Core values']].map(([key,label])=><label key={key} className="block text-xs font-semibold text-gray-600">{label}<textarea rows="5" className={input+' mt-1'} value={site.about?.[key]||''} onChange={e=>setNested('about',key,e.target.value)}/></label>)}</div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish About information</label><button disabled={busy} onClick={saveSite} className="mt-4 rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">{busy?'Saving…':'Save About information'}</button></section>}
    {tab==='social'&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">Social media and homepage video</h3><div className="grid gap-4 sm:grid-cols-2">{Object.keys(site.social||{}).map(key=>field(key+' URL',key,site.social[key],(k,v)=>setNested('social',k,v)))}{field('Video URL','videoUrl',site.videoUrl,setField)}</div><button disabled={busy} onClick={saveSite} className="mt-4 rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">{busy?'Saving…':'Save social links'}</button></section>}
    {tab==='slides'&&editor('homepage_slides',slides)}
    {tab==='ministries'&&editor('site_ministries',ministries)}
    {tab==='facts'&&editor('site_facts',facts)}
    {tab==='events'&&editor('events',events)}
    {tab==='outreach'&&editor('outreach_projects',outreach)}
    {tab==='posts'&&editor('posts',posts)}
    {tab==='team'&&editor('team_members',leaders)}
    {editing&&<section className="admin-card p-5"><h3 className="admin-section-title mb-4">Edit {editing.table==='homepage_slides'?'homepage slide':editing.table==='site_ministries'?'ministry':editing.table==='site_facts'?'statistic':editing.table==='events'?'event':editing.table==='outreach_projects'?'outreach project':editing.table==='posts'?'post': 'church leader'}</h3><div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(editing.item).filter(([key])=>!['id','created_at','updated_at'].includes(key)).map(([key,value])=>key==='published'?<label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value)} onChange={e=>setEditing(v=>({...v,item:{...v.item,published:e.target.checked}}))}/> Published on website</label>:['description','summary','body','excerpt'].includes(key)?<label key={key} className="block text-xs font-semibold text-gray-600 sm:col-span-2">{key.replaceAll('_',' ')}<textarea rows="4" className={input+' mt-1'} value={value??''} onChange={e=>setEditing(v=>({...v,item:{...v.item,[key]:e.target.value}}))}/></label>:<label key={key} className="block text-xs font-semibold text-gray-600">{key.replaceAll('_',' ')}<input className={input+' mt-1'} type={typeof value==='number'?'number':'text'} value={value??''} onChange={e=>setEditing(v=>({...v,item:{...v.item,[key]:typeof value==='number'?Number(e.target.value):e.target.value}}))}/></label>)}
    </div><div className="mt-4 flex gap-2"><button disabled={busy} onClick={()=>saveItem(editing.table,editing.item)} className="rounded bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white">Save record</button><button onClick={()=>setEditing(null)} className="rounded border px-5 py-2.5 text-sm">Cancel</button></div></section>}
    <div className="text-xs leading-5 text-gray-500">Publishing requires the Tidori administrator access policy. The public website reads only published content. Events, outreach projects, posts and leaders are managed here too; their existing page layouts remain unchanged. Keep personal records, donor details and internal notes out of these public content fields.</div>
  </div>;
}
