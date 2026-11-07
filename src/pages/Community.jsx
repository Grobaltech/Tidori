import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseReady } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const tabs = [
  { id: 'directory', label: 'Member directory' },
  { id: 'messages', label: 'Messages' },
  { id: 'prayer', label: 'Prayer wall' },
];

export default function Community() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('directory');
  const [directory, setDirectory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [busy, setBusy] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerText, setPrayerText] = useState('');
  const [prayerVisibility, setPrayerVisibility] = useState('leaders');

  const loadDirectory = useCallback(async () => {
    const { data, error: e } = await supabase.from('member_directory')
      .select('user_id,full_name,photo_url,ministry,small_group').order('full_name');
    if (e) throw e;
    setDirectory(data || []);
  }, []);

  const loadConversations = useCallback(async () => {
    const { data, error: e } = await supabase.from('community_conversation_members')
      .select('conversation_id,community_conversations(id,created_at,community_conversation_members(user_id))')
      .eq('user_id', user.id).order('joined_at', { ascending: false });
    if (e) throw e;
    const rows = (data || []).map(row => row.community_conversations).filter(Boolean);
    const ids = [...new Set(rows.map(row => row.id))];
    const members = [...new Set(rows.flatMap(row => (row.community_conversation_members || []).map(m => m.user_id)))];
    const { data: people, error: peopleError } = members.length
      ? await supabase.from('member_directory').select('user_id,full_name,photo_url').in('user_id', members)
      : { data: [], error: null };
    if (peopleError) throw peopleError;
    const names = new Map((people || []).map(p => [p.user_id, p]));
    const next = rows.map(row => {
      const otherId = (row.community_conversation_members || []).map(m => m.user_id).find(id => id !== user.id);
      return { ...row, otherId, other: names.get(otherId) || { full_name: 'Tidori member' } };
    });
    setConversations(next);
    if (activeConversation && !ids.includes(activeConversation.id)) setActiveConversation(null);
  }, [user, activeConversation]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) { setMessages([]); return; }
    const { data, error: e } = await supabase.from('community_messages')
      .select('id,conversation_id,sender_id,body,created_at')
      .eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(200);
    if (e) throw e;
    const senders = [...new Set((data || []).map(m => m.sender_id))];
    const { data: people, error: pe } = senders.length
      ? await supabase.from('member_directory').select('user_id,full_name,photo_url').in('user_id', senders)
      : { data: [], error: null };
    if (pe) throw pe;
    const names = new Map((people || []).map(p => [p.user_id, p.full_name]));
    setMessages((data || []).map(m => ({ ...m, sender_name: names.get(m.sender_id) || (m.sender_id === user.id ? 'You' : 'Member') })));
  }, [user]);

  const loadPrayer = useCallback(async () => {
    const { data, error: e } = await supabase.from('prayer_requests')
      .select('id,user_id,title,request,visibility,status,created_at')
      .order('created_at', { ascending: false }).limit(100);
    if (e) throw e;
    const ids = [...new Set((data || []).map(p => p.user_id))];
    const { data: people, error: pe } = ids.length
      ? await supabase.from('member_directory').select('user_id,full_name').in('user_id', ids)
      : { data: [], error: null };
    if (pe) throw pe;
    const names = new Map((people || []).map(p => [p.user_id, p.full_name]));
    setPrayers((data || []).map(p => ({ ...p, author: p.user_id === user.id ? 'You' : names.get(p.user_id) || 'Church member' })));
  }, [user]);

  useEffect(() => {
    if (!supabaseReady || !supabase) { setError('Account services are not configured.'); setBusy(false); return; }
    let alive = true;
    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!alive) return;
      if (authError || !data.user) { navigate('/login'); return; }
      setUser(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setBusy(true); setError('');
      try { await Promise.all([loadDirectory(), loadConversations(), loadPrayer()]); }
      catch (e) { if (alive) setError(e.message || 'Could not load the community.'); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [user, loadDirectory, loadConversations, loadPrayer]);

  useEffect(() => {
    if (!activeConversation) { setMessages([]); return; }
    loadMessages(activeConversation.id).catch(e => setError(e.message));
    const channel = supabase.channel('tidori-chat-' + activeConversation.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: 'conversation_id=eq.' + activeConversation.id },
        () => loadMessages(activeConversation.id).catch(e => setError(e.message)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, loadMessages]);

  const filteredDirectory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return directory.filter(person => person.user_id !== user?.id &&
      (!term || [person.full_name, person.ministry, person.small_group].filter(Boolean).join(' ').toLowerCase().includes(term)));
  }, [directory, search, user]);

  const startConversation = async (person) => {
    setWorking(true); setError(''); setNotice('');
    try {
      const { data, error: e } = await supabase.rpc('start_tidori_direct_conversation', { target_user_id: person.user_id });
      if (e) throw e;
      await loadConversations();
      const { data: conversation, error: ce } = await supabase.from('community_conversations')
        .select('id,created_at,community_conversation_members(user_id)')
        .eq('id', data).single();
      if (ce) throw ce;
      setActiveConversation({ ...conversation, otherId: person.user_id, other: person });
      setTab('messages');
    } catch (e) { setError(e.message || 'Could not start this conversation.'); }
    finally { setWorking(false); }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !activeConversation) return;
    setWorking(true); setError('');
    try {
      const { error: e } = await supabase.from('community_messages').insert({
        conversation_id: activeConversation.id, sender_id: user.id, body: draft.trim(),
      });
      if (e) throw e;
      setDraft('');
      await loadMessages(activeConversation.id);
    } catch (e) { setError(e.message || 'Message could not be sent.'); }
    finally { setWorking(false); }
  };

  const submitPrayer = async (event) => {
    event.preventDefault();
    if (!prayerTitle.trim() || !prayerText.trim()) return;
    setWorking(true); setError(''); setNotice('');
    try {
      const { error: e } = await supabase.from('prayer_requests').insert({
        user_id: user.id, title: prayerTitle.trim(), request: prayerText.trim(), visibility: prayerVisibility,
      });
      if (e) throw e;
      setPrayerTitle(''); setPrayerText('');
      await loadPrayer();
      setNotice('Your prayer request has been shared according to your visibility setting.');
    } catch (e) { setError(e.message || 'Prayer request could not be saved.'); }
    finally { setWorking(false); }
  };

  const updatePrayerStatus = async (prayer, status) => {
    setWorking(true); setError('');
    const { error: e } = await supabase.rpc('update_tidori_prayer_status', {
      target_request_id: prayer.id, new_status: status,
    });
    if (e) setError(e.message); else await loadPrayer();
    setWorking(false);
  };

  // Profile role is fetched from the trusted database; user-editable metadata is not used for permissions.
  const [trustedRole, setTrustedRole] = useState('member');
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.role) setTrustedRole(data.role); });
  }, [user]);

  return (
    <>
      <PageHeader title="Tidori Connect" subtitle="Faith, fellowship and friendship" />
      <section className="py-12">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Your church community</h2><p className="text-sm text-gray-600">Connect with members, have private conversations and share prayer needs.</p></div>
            <Link to="/profile" className="text-sm font-semibold text-navy underline">Edit privacy and profile settings</Link>
          </div>
          <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
            {tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-3 text-sm font-semibold ${tab === item.id ? 'border-b-2 border-gold text-navy' : 'text-gray-500'}`}>{item.label}</button>)}
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
          {busy ? <p className="py-10 text-center">Loading your community…</p> : <>
            {tab === 'directory' && <div>
              <label className="mb-5 block"><span className="mb-2 block text-sm font-semibold text-navy">Search members who opted into the directory</span><input className="field" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ministry or small group" /></label>
              {filteredDirectory.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDirectory.map(person => <article key={person.user_id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  {person.photo_url ? <img src={person.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-bold text-gold">{person.full_name.slice(0,1).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{person.full_name}</h3><p className="text-sm text-gray-500">{person.ministry || person.small_group || 'Tidori member'}</p>
                    <button disabled={working} onClick={() => startConversation(person)} className="mt-2 text-sm font-semibold text-[#009cff]">Message member</button></div>
                </article>)}
              </div> : <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">No members match your search yet. Members appear here only when they enable directory visibility in their profile.</p>}
            </div>}
            {tab === 'messages' && <div className="grid min-h-[520px] overflow-hidden rounded-xl border border-gray-200 md:grid-cols-[280px_1fr]">
              <aside className="border-b border-gray-200 bg-gray-50 md:border-b-0 md:border-r">
                <h3 className="border-b border-gray-200 p-4 font-semibold">Conversations</h3>
                {conversations.map(conversation => <button key={conversation.id} onClick={() => setActiveConversation(conversation)} className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left hover:bg-white ${activeConversation?.id === conversation.id ? 'bg-white' : ''}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-semibold text-gold">{(conversation.other.full_name || 'T').slice(0,1).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate font-semibold text-navy">{conversation.other.full_name}</span><span className="block text-xs text-gray-500">Private conversation</span></span>
                </button>)}
                {!conversations.length && <p className="p-4 text-sm text-gray-500">No conversations yet. Find a member in the directory to start one.</p>}
              </aside>
              <div className="flex min-h-[480px] flex-col">
                {activeConversation ? <>
                  <div className="border-b border-gray-200 p-4"><h3 className="font-semibold">{activeConversation.other?.full_name || 'Conversation'}</h3><p className="text-xs text-gray-500">Only the two participants can read these messages.</p></div>
                  <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
                    {messages.map(message => <div key={message.id} className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_id === user.id ? 'bg-ink text-white' : 'border border-gray-200 bg-white text-gray-700'}`}><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><p className="mt-1 text-right text-[10px] opacity-60">{new Date(message.created_at).toLocaleString()}</p></div></div>)}
                    {!messages.length && <p className="py-10 text-center text-sm text-gray-500">Say hello and start the conversation.</p>}
                  </div>
                  <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-200 p-3"><input className="field min-w-0 flex-1" maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a private message…" /><button disabled={working || !draft.trim()} className="btn-custom">Send</button></form>
                </> : <div className="flex flex-1 items-center justify-center p-8 text-center text-gray-500">Choose a conversation or start one from the member directory.</div>}
              </div>
            </div>}
            {tab === 'prayer' && <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
              <form onSubmit={submitPrayer} className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xl font-bold">Share a prayer request</h3>
                <label className="block text-sm font-semibold text-navy">Title<input className="field mt-2" required maxLength={160} value={prayerTitle} onChange={e => setPrayerTitle(e.target.value)} placeholder="What would you like prayer for?" /></label>
                <label className="block text-sm font-semibold text-navy">Request<textarea className="field mt-2" required rows="5" maxLength={4000} value={prayerText} onChange={e => setPrayerText(e.target.value)} placeholder="Share only what you are comfortable sharing…" /></label>
                <label className="block text-sm font-semibold text-navy">Who can see this?<select className="field mt-2" value={prayerVisibility} onChange={e => setPrayerVisibility(e.target.value)}><option value="private">Only me</option><option value="leaders">Church leaders</option><option value="church">Church community</option></select></label>
                <button className="btn-custom w-full" disabled={working || !prayerTitle.trim() || !prayerText.trim()}>{working ? 'Saving…' : 'Share prayer request'}</button>
              </form>
              <div className="space-y-4"><div><h3 className="text-xl font-bold">Prayer requests</h3><p className="text-sm text-gray-500">You see your own requests and any requests shared with you.</p></div>
                {prayers.map(prayer => <article key={prayer.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold">{prayer.title}</h4><p className="text-xs text-gray-500">Shared by {prayer.author} · {new Date(prayer.created_at).toLocaleDateString()}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize">{prayer.status}</span></div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{prayer.request}</p>
                  <p className="mt-3 text-xs text-gray-400">Visibility: {prayer.visibility === 'church' ? 'Church community' : prayer.visibility === 'leaders' ? 'Church leaders' : 'Private'}</p>
                  {prayer.user_id === user.id && <button onClick={async()=>{const {error:e}=await supabase.from('prayer_requests').delete().eq('id',prayer.id);if(e)setError(e.message);else loadPrayer();}} className="mt-3 text-xs font-semibold text-red-600">Delete my request</button>}
                  {['leader','admin','super_admin'].includes(trustedRole) && <div className="mt-3 flex gap-2"><button disabled={working} onClick={()=>updatePrayerStatus(prayer,'praying')} className="text-xs font-semibold text-[#009cff]">Mark praying</button><button disabled={working} onClick={()=>updatePrayerStatus(prayer,'answered')} className="text-xs font-semibold text-green-700">Mark answered</button></div>}
                </article>)}
                {!prayers.length && <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">No prayer requests are visible yet.</p>}
              </div>
            </div>}
          </>}
          <div className="mt-8 text-center"><Link to="/profile" className="text-sm font-semibold text-navy underline">Manage your profile and privacy preferences</Link></div>
        </div>
      </section>
    </>
  );
}
