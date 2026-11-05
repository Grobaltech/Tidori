import { useCallback, useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSyncAlt, FaSave, FaTimes, FaEye, FaEyeSlash, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const emptyForm = { name: '', role: '', photo_url: '', sort_order: 0, published: true };
const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]';
export default function TeamManager({ canManage = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
    if (queryError) setError(queryError.message);
    else setRows(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const beginAdd = () => { setError(''); setNotice(''); setEditing({ ...emptyForm, _new: true }); };
  const beginEdit = row => { setError(''); setNotice(''); setEditing({ ...row }); };
  const save = async event => {
    event.preventDefault();
    if (!canManage || !editing) return;
    const name = editing.name?.trim();
    const role = editing.role?.trim();
    if (!name || !role) { setError('Enter both the team member name and role.'); return; }
    setBusy(true); setError(''); setNotice('');
    const payload = { name, role, photo_url: editing.photo_url?.trim() || null, sort_order: Number(editing.sort_order) || 0, published: Boolean(editing.published) };
    const result = editing._new
      ? await supabase.from('team_members').insert(payload)
      : await supabase.from('team_members').update(payload).eq('id', editing.id);
    if (result.error) setError(result.error.message);
    else { setNotice(editing._new ? 'Team member added.' : 'Team member updated.'); setEditing(null); await load(); }
    setBusy(false);
  };
  const remove = async row => {
    if (!canManage || !window.confirm('Delete ' + row.name + ' from the church team? This also removes the public team card.')) return;
    setBusy(true); setError(''); setNotice('');
    const { error: deleteError } = await supabase.from('team_members').delete().eq('id', row.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice('Team member deleted.'); await load(); }
    setBusy(false);
  };
  const togglePublished = async row => {
    if (!canManage) return;
    setBusy(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('team_members').update({ published: !row.published }).eq('id', row.id);
    if (updateError) setError(updateError.message);
    else { setNotice(row.published ? 'Team member hidden from the public website.' : 'Team member published on the public website.'); await load(); }
    setBusy(false);
  };
  const move = async (row, direction) => {
    if (!canManage) return;
    const index = rows.findIndex(item => item.id === row.id);
    const other = rows[index + direction];
    if (!other) return;
    setBusy(true); setError('');
    const first = await supabase.from('team_members').update({ sort_order: Number(other.sort_order) || 0 }).eq('id', row.id);
    const second = first.error ? null : await supabase.from('team_members').update({ sort_order: Number(row.sort_order) || 0 }).eq('id', other.id);
    if (first.error || second?.error) setError(first.error?.message || second.error.message);
    await load(); setBusy(false);
  };
  return <div className="space-y-5">
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div><h2 className="admin-section-title">Church team members</h2><p className="admin-muted mt-1">Manage the names, positions and photographs displayed on the public Our Leaders page.</p></div>
        <div className="flex gap-2"><button type="button" onClick={load} disabled={loading || busy} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"><FaSyncAlt className={loading ? 'mr-2 inline animate-spin' : 'mr-2 inline'} />Refresh</button>{canManage && <button type="button" onClick={beginAdd} className="rounded-lg bg-[#009cff] px-3 py-2 text-sm font-semibold text-white"><FaPlus className="mr-2 inline" />Add team member</button>}</div>
      </div>
      <div className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Total records</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Published</p><p className="mt-1 text-2xl font-bold">{rows.filter(r => r.published).length}</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Hidden</p><p className="mt-1 text-2xl font-bold">{rows.filter(r => !r.published).length}</p></div>
      </div>
      {error && <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? <div className="admin-empty">Loading church team…</div> : !rows.length ? <div className="admin-empty">No team members have been added yet.</div> :
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row,index) => <article key={row.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="flex h-44 items-center justify-center bg-gray-50">{row.photo_url ? <img src={row.photo_url} alt={row.name} className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display='none'; }} /> : <span className="text-4xl font-bold text-gray-300">{(row.name || '?').slice(0,1).toUpperCase()}</span>}</div>
            <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-[#191c24]">{row.name}</h3><p className="text-sm text-gray-500">{row.role}</p></div><span className={row.published ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600'}>{row.published ? 'Published' : 'Hidden'}</span></div>
              <p className="text-xs text-gray-400">Display order: {row.sort_order ?? 0}</p>
              {canManage && <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <button type="button" onClick={() => beginEdit(row)} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold"><FaEdit className="mr-1 inline" />Edit</button>
                <button type="button" disabled={busy} onClick={() => togglePublished(row)} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{row.published ? <><FaEyeSlash className="mr-1 inline" />Hide</> : <><FaEye className="mr-1 inline" />Publish</>}</button>
                <button type="button" disabled={busy || index===0} onClick={() => move(row,-1)} className="rounded border border-gray-200 px-2 py-1.5 text-xs disabled:opacity-30" title="Move up"><FaArrowUp /></button>
                <button type="button" disabled={busy || index===rows.length-1} onClick={() => move(row,1)} className="rounded border border-gray-200 px-2 py-1.5 text-xs disabled:opacity-30" title="Move down"><FaArrowDown /></button>
                <button type="button" disabled={busy} onClick={() => remove(row)} className="ml-auto rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"><FaTrash className="mr-1 inline" />Delete</button>
              </div>}
            </div>
          </article>)}
        </div>}
    </section>
    {editing && canManage && <section className="admin-card p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="admin-section-title">{editing._new ? 'Add church team member' : 'Edit church team member'}</h2><p className="admin-muted mt-1">Changes are saved to the live team_members table.</p></div><button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold text-[#009cff]"><FaTimes className="mr-1 inline" />Close</button></div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Full name<input className={fieldClass + ' mt-1'} value={editing.name || ''} onChange={e => setEditing(v => ({...v,name:e.target.value}))} maxLength={120} required /></label>
        <label className="text-xs font-semibold text-gray-600">Position / role<input className={fieldClass + ' mt-1'} value={editing.role || ''} onChange={e => setEditing(v => ({...v,role:e.target.value}))} maxLength={120} placeholder="e.g. Senior Pastor" required /></label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Photo URL<input className={fieldClass + ' mt-1'} type="url" value={editing.photo_url || ''} onChange={e => setEditing(v => ({...v,photo_url:e.target.value}))} placeholder="https://… or /img/team-member.jpg" /></label>
        {editing.photo_url && <div className="sm:col-span-2"><p className="mb-2 text-xs font-semibold text-gray-600">Photo preview</p><img src={editing.photo_url} alt="Team member preview" className="h-36 w-36 rounded-lg object-cover" /></div>}
        <label className="text-xs font-semibold text-gray-600">Display order<input className={fieldClass + ' mt-1'} type="number" min="0" step="1" value={editing.sort_order ?? 0} onChange={e => setEditing(v => ({...v,sort_order:e.target.value}))} /></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={Boolean(editing.published)} onChange={e => setEditing(v => ({...v,published:e.target.checked}))} /> Visible on public website</label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FaSave className="mr-2 inline" />{busy ? 'Saving…' : 'Save team member'}</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold">Cancel</button></div>
      </form>
    </section>}
  </div>;
}
