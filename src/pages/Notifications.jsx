import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaCheckDouble, FaTrashAlt } from 'react-icons/fa';
import { supabase, supabaseReady } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const formatDate = value => new Date(value).toLocaleString('en-UG', {
  timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short',
});
const iconFor = type => ({ message: '✉️', prayer: '🙏', appointment: '📅', payment: '💳', call: '📹' }[type] || '🔔');

export default function Notifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: queryError } = await supabase.from('notifications')
      .select('id,title,body,notification_type,action_path,read_at,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
    if (queryError) setError(queryError.message);
    else { setRows(data || []); setError(''); }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!supabaseReady || !supabase) { setError('Account services are not configured.'); setLoading(false); return; }
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) navigate('/login');
      else setUser(data.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase.channel('tidori-notifications-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + user.id }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const markRead = async row => {
    if (!row.read_at) {
      const { error: e } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', row.id);
      if (e) { setError(e.message); return; }
    }
    navigate(row.action_path || '/notifications');
  };
  const markAll = async () => {
    const { error: e } = await supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id).is('read_at', null);
    if (e) setError(e.message); else load();
  };
  const remove = async id => {
    const { error: e } = await supabase.from('notifications').delete().eq('id', id);
    if (e) setError(e.message); else load();
  };

  const unread = rows.filter(row => !row.read_at).length;
  const visible = rows.filter(row => filter === 'all' || (filter === 'unread' ? !row.read_at : Boolean(row.read_at)));

  return <>
    <PageHeader title="Notifications" subtitle="Your Tidori updates and reminders" />
    <section className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-2xl font-bold text-navy">Notification inbox</h2><p className="text-sm text-gray-500">{unread} unread · {rows.length} total</p></div>
          <button type="button" onClick={markAll} disabled={!unread} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"><FaCheckDouble /> Mark all read</button>
        </div>
        <div className="mb-4 flex gap-2">
          {['all','unread','read'].map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === value ? 'bg-ink text-white' : 'bg-gray-100 text-gray-600'}`}>{value}</button>)}
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="py-12 text-center text-gray-500">Loading notifications…</p> : visible.length ? <div className="space-y-3">
          {visible.map(row => <article key={row.id} className={`flex gap-3 rounded-xl border p-4 ${row.read_at ? 'border-gray-200 bg-white' : 'border-gold/50 bg-amber-50/40'}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">{iconFor(row.notification_type)}</span>
            <button type="button" onClick={() => markRead(row)} className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-2 font-semibold text-navy">{row.title}{!row.read_at && <span className="h-2 w-2 rounded-full bg-[#009cff]" />}</span>
              <span className="mt-1 block text-sm text-gray-600">{row.body}</span>
              <span className="mt-2 block text-xs text-gray-400">{formatDate(row.created_at)} · {row.read_at ? 'Read' : 'Unread'} · Open</span>
            </button>
            <button type="button" onClick={() => remove(row.id)} aria-label="Delete notification" title="Delete notification" className="self-start p-2 text-gray-400 hover:text-red-600"><FaTrashAlt /></button>
          </article>)}
        </div> : <div className="rounded-xl bg-gray-50 px-6 py-12 text-center"><FaBell className="mx-auto mb-3 text-3xl text-gray-300" /><h3 className="font-semibold text-navy">You’re all caught up</h3><p className="mt-1 text-sm text-gray-500">New messages and church updates will appear here.</p><Link to="/community" className="mt-4 inline-block text-sm font-semibold text-[#009cff]">Visit Tidori Connect</Link></div>}
      </div>
    </section>
  </>;
}
