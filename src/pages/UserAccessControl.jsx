import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const modules = [
  { key:'comfort_bridge', label:'The Comfort Bridge', description:'Confidential grief-support applications, sponsorship allocation, prayer assignments and pastoral sessions', actions:['manage'] },
  { key:'members', label:'Members', description:'Member directory and church profiles', actions:['view','add','edit','delete','approve','export'] },
  { key:'events', label:'Events', description:'Church events and registrations', actions:['view','add','edit','delete','approve','publish','export'] },
  { key:'ministries', label:'Ministries', description:'Ministry records and assignments', actions:['view','add','edit','delete','approve'] },
  { key:'outreach', label:'Outreach', description:'Outreach projects and activities', actions:['view','add','edit','delete','approve','publish','export'] },
  { key:'website', label:'Website CMS', description:'Public pages, slideshow, media and posts', actions:['manage'] },
  { key:'messages', label:'Messages', description:'Contact inbox and correspondence', actions:['view','reply','delete','export'] },
  { key:'volunteers', label:'Volunteers', description:'Volunteer applications and records', actions:['view','add','edit','delete','approve','export'] },
  { key:'team', label:'Church team', description:'Leaders and team directory', actions:['view','add','edit','delete','publish'] },
  { key:'newsletter', label:'Newsletter', description:'Subscriber records and campaigns', actions:['view','add','edit','delete','export'] },
  { key:'giving', label:'Giving & pledges', description:'Giving records, pledges and payment status', actions:['view','add','edit','approve','export'] },
  { key:'reports', label:'Reports', description:'Church activity and performance reports', actions:['view','export'] },
];
const actionLabels = { view:'View', add:'Add', edit:'Edit', delete:'Delete', approve:'Approve', publish:'Publish', reply:'Reply', export:'Export', manage:'Manage all' };

export default function UserAccessControl({ role }) {
  const [users,setUsers] = useState([]);
  const [grants,setGrants] = useState([]);
  const [audit,setAudit] = useState([]);
  const [selected,setSelected] = useState('');
  const [chosen,setChosen] = useState([]);
  const [search,setSearch] = useState('');
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    const [u,p,a] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,role,member_status').in('role',['member','leader']).order('full_name'),
      supabase.from('user_permissions').select('user_id,permission,granted_at,granted_by').order('permission'),
      supabase.from('access_audit_log').select('*').order('created_at',{ascending:false}).limit(20),
    ]);
    if(u.error || p.error || a.error) setError([u.error?.message,p.error?.message,a.error?.message].filter(Boolean).join(' · '));
    setUsers(u.data || []); setGrants(p.data || []); setAudit(a.data || []);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{setChosen(grants.filter(g=>g.user_id===selected).map(g=>g.permission));},[selected,grants]);

  const filtered = useMemo(()=>users.filter(u=>[u.full_name,u.email,u.member_status].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase()))),[users,search]);
  const selectedUser = users.find(u=>u.id===selected);
  const toggle = (key) => setChosen(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key]);
  const save = async () => {
    if(!selected) return;
    setBusy(true);setError('');setNotice('');
    const {data,error:saveError}=await supabase.rpc('replace_tidori_user_permissions',{target_user_id:selected,permission_keys:chosen});
    if(saveError) setError(saveError.message);
    else {setNotice(data?.message || 'Permissions saved. The user may need to sign in again.');await load();}
    setBusy(false);
  };

  if(role!=='admin' && role!=='super_admin') return null;
  return <div className="space-y-5">
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="admin-section-title">Church user access control</h2><p className="admin-muted mt-1">Grant individual permissions to existing church users. Only member and leader accounts appear here; administrator roles cannot be changed through this screen.</p></div><button type="button" onClick={load} disabled={loading} className="rounded border px-3 py-2 text-sm font-semibold">Refresh</button></div>
      {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice&&<p role="status" className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,0.8fr)_1.6fr]">
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-gray-600">Find church user<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <div className="mt-3 max-h-[520px] overflow-y-auto rounded-lg border border-gray-100">
            {loading?<p className="p-4 text-sm text-gray-500">Loading users…</p>:filtered.map(u=><button type="button" key={u.id} onClick={()=>setSelected(u.id)} className={'block w-full border-b border-gray-100 p-3 text-left '+(selected===u.id?'bg-blue-50':'hover:bg-gray-50')}><strong className="block text-sm text-[#191c24]">{u.full_name||'Unnamed user'}</strong><span className="block text-xs text-gray-500">{u.email||'No email'} · {u.role} · {u.member_status||'visitor'}</span><span className="mt-1 text-[11px] text-gray-400">{grants.filter(g=>g.user_id===u.id).length} permissions</span></button>)}
            {!loading&&!filtered.length&&<p className="p-4 text-sm text-gray-500">No church users found. New accounts must first be invited from User Management.</p>}
          </div>
        </div>
        <div>
          {!selectedUser?<div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">Select a church user to manage their access.</div>:<>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-[#191c24]">{selectedUser.full_name||selectedUser.email}</h3><p className="text-xs text-gray-500">{selectedUser.email} · {chosen.length} permissions selected</p></div><button type="button" onClick={()=>setChosen([])} className="text-xs font-semibold text-red-600">Clear all</button></div>
            <div className="space-y-3">{modules.map(m=><section key={m.key} className="rounded-lg border border-gray-100 p-3"><div className="mb-2"><h4 className="text-sm font-semibold text-[#191c24]">{m.label}</h4><p className="text-xs text-gray-500">{m.description}</p></div><div className="flex flex-wrap gap-x-4 gap-y-2">{m.actions.map(a=>{const key=m.key+'.'+a;return <label key={key} className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={chosen.includes(key)} onChange={()=>toggle(key)}/>{actionLabels[a]}</label>;})}</div></section>)}</div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={save} className="rounded-lg bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Save permissions'}</button><button type="button" onClick={()=>{setChosen(grants.filter(g=>g.user_id===selected).map(g=>g.permission));}} className="rounded-lg border px-5 py-2.5 text-sm">Reset changes</button></div>
          </>}
        </div>
      </div>
    </section>
    <section className="admin-card overflow-hidden"><div className="border-b border-gray-100 px-5 py-4"><h3 className="text-sm font-bold text-[#191c24]">Recent access changes</h3><p className="admin-muted mt-1">Latest permission grants and revocations.</p></div><div className="overflow-x-auto"><table className="admin-table w-full"><thead><tr><th>Action</th><th>Target account</th><th>Permissions</th><th>Date</th></tr></thead><tbody>{audit.map(row=><tr key={row.id}><td>{row.action}</td><td className="font-mono text-xs">{row.target_user_id||'—'}</td><td className="max-w-sm truncate text-xs">{row.permission||'—'}</td><td>{row.created_at?new Date(row.created_at).toLocaleString():'—'}</td></tr>)}</tbody></table>{!audit.length&&<p className="p-4 text-sm text-gray-500">No access changes have been recorded yet.</p>}</div></section>
    <section className="admin-card p-5"><h3 className="text-sm font-bold text-[#191c24]">Authority boundaries</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-gray-500"><li>Only Tidori administrators can grant or revoke access.</li><li>Church users cannot grant permissions to themselves or other users.</li><li>Only Super Administrator can promote an account to Tidori Administrator.</li><li>Access changes are recorded in the audit log and enforced by database policies for protected modules.</li></ul></section>
  </div>;
}
