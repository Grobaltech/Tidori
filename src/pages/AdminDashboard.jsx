import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBars, FaTimes, FaTachometerAlt, FaUsers, FaPrayingHands, FaCalendarAlt,
  FaHandsHelping, FaNewspaper, FaEnvelope, FaCog, FaSignOutAlt, FaChurch,
  FaUserShield, FaChartLine, FaSearch, FaSyncAlt, FaInbox, FaUserCheck, FaBell, FaUserCircle, FaChevronDown
} from 'react-icons/fa';
import { supabase, supabaseReady } from '../lib/supabase';
import '../admin/admin-theme.css';
import WebsiteCMS from './WebsiteCMS';

const sections = [
  { id: 'overview', label: 'Dashboard', icon: FaTachometerAlt },
  { id: 'users', label: 'Users', icon: FaUserShield },
  { id: 'members', label: 'Members', icon: FaUsers },
  { id: 'ministries', label: 'Ministries', icon: FaPrayingHands },
  { id: 'events', label: 'Events', icon: FaCalendarAlt },
  { id: 'outreach', label: 'Outreach', icon: FaHandsHelping },
  { id: 'content', label: 'Website CMS', icon: FaNewspaper },
  { id: 'messages', label: 'Messages', icon: FaEnvelope },
  { id: 'settings', label: 'Settings', icon: FaCog },
];

const tableConfig = {
  users: { table: 'profiles', title: 'User accounts', columns: [['full_name','Full name'],['email','Email'],['phone','Phone'],['role','Account role'],['member_status','Membership status'],['created_at','Registered']], search: ['full_name','email','phone','role','member_status'] },
  members: { table: 'profiles', title: 'Member records', columns: [['full_name','Full name'],['email','Email'],['phone','Phone'],['role','Account role'],['member_status','Church status'],['created_at','Joined']], search: ['full_name','email','phone','role','member_status'] },
  events: { table: 'events', title: 'Events', columns: [['title','Title'],['location','Location'],['starts_at','Starts'],['published','Published']], search: ['title','location','description'] },
  outreach: { table: 'outreach_projects', title: 'Outreach projects', columns: [['title','Project'],['goal_amount','Goal'],['raised_amount','Raised'],['published','Published']], search: ['title','summary'] },
  content: { table: 'posts', title: 'Website posts', columns: [['title','Title'],['slug','Slug'],['author','Author'],['published','Published'],['published_at','Published date']], search: ['title','slug','author','excerpt'] },
  messages: { table: 'contact_messages', title: 'Inbox', columns: [['name','From'],['email','Email'],['subject','Subject'],['message','Message'],['created_at','Received']], search: ['name','email','subject','message'] },
  volunteers: { table: 'volunteers', title: 'Volunteer submissions', columns: [['name','Name'],['email','Email'],['phone','Phone'],['area','Area'],['created_at','Received']], search: ['name','email','phone','area','message'] },
  team: { table: 'team_members', title: 'Church team', columns: [['name','Name'],['role','Role'],['sort_order','Order'],['published','Published']], search: ['name','role'] },
  newsletter: { table: 'newsletter_subscribers', title: 'Newsletter subscribers', columns: [['email','Email'],['created_at','Subscribed']], search: ['email'] },
  pledges: { table: 'donation_pledges', title: 'Donation pledges', columns: [['name','Name'],['email','Email'],['amount','Amount'],['status','Status'],['created_at','Received']], search: ['name','email','status'] },
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return String(value);
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [dataError, setDataError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [records, setRecords] = useState({});
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [topbarMenu, setTopbarMenu] = useState(null);

  useEffect(() => {
    let alive = true;
    const verify = async () => {
      if (!supabaseReady || !supabase) {
        if (alive) { setError('Account services are not configured.'); setChecking(false); }
        return;
      }
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !auth.user) { navigate('/login'); return; }
      setUser(auth.user);
      const { data, error: profileError } = await supabase
        .from('profiles').select('full_name,role').eq('id', auth.user.id).maybeSingle();
      if (!alive) return;
      if (profileError) setError(profileError.message);
      else if (!data || !['admin', 'super_admin'].includes(data.role)) setError('Your account does not have administrator access. Please contact the Tidori super administrator.');
      else setProfile(data);
      setChecking(false);
    };
    verify();
    const { data: listener } = supabaseReady && supabase
      ? supabase.auth.onAuthStateChange((_event, session) => { if (!session) navigate('/login'); })
      : { data: { subscription: { unsubscribe() {} } } };
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [navigate]);

  const loadOverview = useCallback(async () => {
    if (!supabase || !profile) return;
    setLoadingData(true); setDataError('');
    const requests = [
      ['users', supabase.from('profiles').select('id,full_name,email,phone,role,member_status,created_at').order('created_at',{ascending:false}).limit(100)],
      ['members', supabase.from('profiles').select('id,full_name,email,phone,role,member_status,created_at').order('created_at',{ascending:false}).limit(100)],
      ['events', supabase.from('events').select('*').order('starts_at',{ascending:false}).limit(100)],
      ['outreach', supabase.from('outreach_projects').select('*').order('created_at',{ascending:false}).limit(100)],
      ['content', supabase.from('posts').select('*').order('published_at',{ascending:false}).limit(100)],
      ['messages', supabase.from('contact_messages').select('*').order('created_at',{ascending:false}).limit(100)],
      ['volunteers', supabase.from('volunteers').select('*').order('created_at',{ascending:false}).limit(100)],
      ['team', supabase.from('team_members').select('*').order('sort_order',{ascending:true}).limit(100)],
      ['newsletter', supabase.from('newsletter_subscribers').select('*').order('created_at',{ascending:false}).limit(100)],
      ['pledges', supabase.from('donation_pledges').select('*').order('created_at',{ascending:false}).limit(100)],
    ];
    const settled = await Promise.all(requests.map(async ([key, query]) => {
      const [result, countResult] = await Promise.all([
        query,
        supabase.from(tableConfig[key].table).select('*', { count: 'exact', head: true })
      ]);
      return [key, result.data || [], result.error, countResult.count, countResult.error];
    }));
    const nextRecords = {};
    const nextCounts = {};
    const failures = [];
    for (const [key, rows, err, exactCount, countError] of settled) {
      nextRecords[key] = rows;
      nextCounts[key] = exactCount ?? rows.length;
      if (err) failures.push(`${tableConfig[key].title}: ${err.message}`);
      if (countError && !err) failures.push(`${tableConfig[key].title} count: ${countError.message}`);
    }
    setRecords(nextRecords);
    setCounts(nextCounts);
    if (failures.length) setDataError(failures.join(' • '));
    setLoadingData(false);
  }, [profile]);

  useEffect(() => { if (profile) loadOverview(); }, [profile, loadOverview]);

  const initials = useMemo(() => (profile?.full_name || user?.email || 'A').slice(0, 1).toUpperCase(), [profile, user]);
  const signOut = async () => { await supabase.auth.signOut(); navigate('/login'); };
  const changeSection = (id) => { setActiveSection(id); setSearch(''); setSelectedRecord(null); setSidebarOpen(false); };
  const filteredRecords = useMemo(() => {
    const key = activeSection === 'ministries' ? 'members' : activeSection;
    const rows = records[key] || [];
    const cfg = tableConfig[key];
    if (!cfg || !search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter(row => cfg.search.some(field => String(row[field] ?? '').toLowerCase().includes(needle)));
  }, [activeSection, records, search]);

  if (checking) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Checking administrator access…</div>;
  if (error) return <div className="min-h-screen grid place-items-center bg-[#f3f6f9] p-5"><div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm"><FaUserShield className="mx-auto mb-4 text-3xl text-[#009cff]" /><h1 className="mb-2 text-xl font-bold text-[#191c24]">Administrator access</h1><p className="mb-5 text-sm text-gray-500">{error}</p><div className="flex justify-center gap-3"><Link className="rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white" to="/profile">My profile</Link><button onClick={signOut} className="rounded border px-4 py-2 text-sm">Sign out</button></div></div></div>;

  const current = sections.find(s => s.id === activeSection) || sections[0];
  const Icon = current.icon;
  const renderTable = (key) => {
    const cfg = tableConfig[key];
    const rows = key === 'ministries'
      ? [...new Map((records.members || []).filter(r => r.ministry).map(r => [r.ministry, { ministry:r.ministry, people:(records.members || []).filter(p => p.ministry === r.ministry).length }])).values()]
      : (records[key] || []);
    if (key === 'ministries') return <div className="overflow-x-auto"><table className="admin-table w-full"><thead><tr><th>Ministry</th><th>People recorded</th></tr></thead><tbody>{rows.map(r=><tr key={r.ministry}><td>{r.ministry}</td><td>{r.people}</td></tr>)}</tbody></table>{!rows.length && <div className="admin-empty">No ministry assignments have been recorded in member profiles yet.</div>}</div>;
    return <div className="overflow-x-auto"><table className="admin-table w-full"><thead><tr>{cfg.columns.map(([field,label])=><th key={field}>{label}</th>)}</tr></thead><tbody>{filteredRecords.map((row,i)=><tr key={row.id || row.email || i} onClick={()=>setSelectedRecord(row)} className="cursor-pointer"><td className="sr-only">{row.id}</td>{cfg.columns.map(([field])=><td key={field}>{field === 'message' ? (String(row[field] || '').length > 110 ? String(row[field]).slice(0, 110) + '…' : formatValue(row[field])) : formatValue(row[field])}</td>)}</tr>)}</tbody></table>{!filteredRecords.length && <div className="admin-empty">{loadingData ? 'Loading records…' : 'No matching records were found.'}</div>}</div>;
  };

  return (
    <div className={`tidori-admin ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand !gap-3">
          <img src="/img/grok_1793864104245.jpg" alt="Tidori Ministries" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
          <span>TIDORI <small className="block text-[10px] font-semibold tracking-[2px] text-gray-400">ADMINISTRATION</small></span>
        </Link>
        <div className="admin-nav-label">Main menu</div>
        <nav className="admin-nav" aria-label="Administrator navigation">
          {sections.map(item => { const ItemIcon = item.icon; return <button key={item.id} className={activeSection === item.id ? 'active' : ''} onClick={() => changeSection(item.id)}><span className="admin-nav-icon"><ItemIcon /></span>{item.label}</button>; })}
          <div className="admin-nav-label mt-5">Records</div>
          <button className={activeSection === 'volunteers' ? 'active' : ''} onClick={()=>changeSection('volunteers')}><span className="admin-nav-icon"><FaUserCheck /></span>Volunteers</button>
          <button className={activeSection === 'team' ? 'active' : ''} onClick={()=>changeSection('team')}><span className="admin-nav-icon"><FaChurch /></span>Church team</button>
          <button className={activeSection === 'newsletter' ? 'active' : ''} onClick={()=>changeSection('newsletter')}><span className="admin-nav-icon"><FaInbox /></span>Subscribers</button>
          <button className={activeSection === 'pledges' ? 'active' : ''} onClick={()=>changeSection('pledges')}><span className="admin-nav-icon"><FaHandsHelping /></span>Giving pledges</button>
        </nav>
        <div className="mx-5 mt-8 rounded-lg bg-white p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#191c24]"><FaUserShield className="text-[#009cff]" /> Secure administration</div><p className="m-0 text-xs leading-5 text-gray-400">Access is restricted to authorised Tidori administrators.</p></div>
      </aside>
      <button className="admin-mobile-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="flex items-center gap-3"><button className="admin-icon-button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(v => !v)}>{sidebarOpen ? <FaTimes /> : <FaBars />}</button><img src="/img/grok_1793864104245.jpg" alt="Tidori Ministries" className="h-10 w-10 rounded-md bg-white object-contain p-0.5 sm:hidden" /><div className="hidden sm:block"><div className="text-sm font-bold text-[#191c24]">Administration</div><div className="text-xs text-gray-400">Tidori Ministries</div></div></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 text-xs text-gray-400 xl:flex"><FaSearch /> Live Supabase records</span>
            <div className="admin-topbar-menu">
              <button type="button" className="admin-icon-button admin-topbar-action" title="Messages" aria-label="Messages" aria-expanded={topbarMenu === 'messages'} onClick={() => setTopbarMenu(v => v === 'messages' ? null : 'messages')}><FaEnvelope />{(records.messages || []).length > 0 && <span className="admin-topbar-dot" />}</button>
              {topbarMenu === 'messages' && <div className="admin-dropdown admin-message-dropdown">
                <div className="admin-dropdown-heading"><strong>Messages</strong><button type="button" onClick={() => { changeSection('messages'); setTopbarMenu(null); }}>View all</button></div>
                {(records.messages || []).slice(0,5).map(row => <button type="button" className="admin-dropdown-item" key={row.id} onClick={() => { changeSection('messages'); setSelectedRecord(row); setTopbarMenu(null); }}><span className="admin-dropdown-item-icon"><FaEnvelope /></span><span className="min-w-0 flex-1"><strong>{row.name || 'Website visitor'}</strong><small>{row.subject || row.message || row.email || 'New contact message'}</small></span><small>{formatValue(row.created_at)}</small></button>)}
                {!records.messages?.length && <p className="admin-dropdown-empty">No contact messages found.</p>}
              </div>}
            </div>
            <div className="admin-topbar-menu">
              <button type="button" className="admin-icon-button admin-topbar-action" title="Notifications" aria-label="Notifications" aria-expanded={topbarMenu === 'notifications'} onClick={() => setTopbarMenu(v => v === 'notifications' ? null : 'notifications')}><FaBell />{(records.messages || []).length + (records.volunteers || []).length + (records.pledges || []).length > 0 && <span className="admin-topbar-dot" />}</button>
              {topbarMenu === 'notifications' && <div className="admin-dropdown admin-notification-dropdown">
                <div className="admin-dropdown-heading"><strong>Recent activity</strong><span>{(records.messages || []).length + (records.volunteers || []).length + (records.pledges || []).length} records</span></div>
                {[...(records.messages || []).map(row => ({...row, _kind:'messages', _label:'New contact message', _name:row.name || row.email || 'Website visitor'})), ...(records.volunteers || []).map(row => ({...row, _kind:'volunteers', _label:'Volunteer submission', _name:row.name || row.email || 'Applicant'})), ...(records.pledges || []).map(row => ({...row, _kind:'pledges', _label:'Donation pledge', _name:row.name || row.email || 'Contributor'}))].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0,8).map((row,i) => <button type="button" className="admin-dropdown-item" key={row.id || row._kind + '-' + i} onClick={() => { changeSection(row._kind); setSelectedRecord(row); setTopbarMenu(null); }}><span className="admin-dropdown-item-icon"><FaBell /></span><span className="min-w-0 flex-1"><strong>{row._label}</strong><small>{row._name} · {row.subject || row.message || row.amount || 'Open record'}</small></span><small>{formatValue(row.created_at)}</small></button>)}
                {!records.messages?.length && !records.volunteers?.length && !records.pledges?.length && <p className="admin-dropdown-empty">You're all caught up. No recent activity.</p>}
              </div>}
            </div>
            <div className="admin-topbar-menu">
              <button type="button" className="admin-profile admin-profile-trigger" aria-label="Open administrator profile menu" aria-expanded={topbarMenu === 'profile'} onClick={() => setTopbarMenu(v => v === 'profile' ? null : 'profile')}><span className="admin-avatar">{initials}</span><span className="hidden sm:block">{profile?.full_name || user?.email}</span><FaChevronDown className="text-xs text-gray-400" /></button>
              {topbarMenu === 'profile' && <div className="admin-dropdown admin-profile-dropdown">
                <div className="admin-profile-summary"><span className="admin-avatar">{initials}</span><span><strong>{profile?.full_name || 'Administrator'}</strong><small>{user?.email}</small><small className="capitalize">{String(profile?.role || 'admin').replaceAll('_',' ')}</small></span></div>
                <button type="button" className="admin-dropdown-link" onClick={() => { changeSection('settings'); setTopbarMenu(null); }}><FaUserCircle /> Account & settings</button>
                <button type="button" className="admin-dropdown-link" onClick={() => { setTopbarMenu(null); signOut(); }}><FaSignOutAlt /> Sign out</button>
              </div>}
            </div>
          </div>
        </header>
        <div className="admin-content">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#009cff]">Tidori Ministries</p><h1 className="admin-page-title">{current.label}</h1><p className="admin-muted mt-1">Live records from the Tidori Supabase project.</p></div><div className="flex items-center gap-2"><span className="admin-pill">Administrator</span><button onClick={loadOverview} disabled={loadingData} className="admin-icon-button" title="Refresh live records"><FaSyncAlt className={loadingData ? 'animate-spin' : ''} /></button></div></div>
          {dataError && <div role="alert" className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><strong>Some records could not be loaded.</strong> {dataError} <span className="block mt-1">Run the administrator access SQL file supplied with this update in the Tidori Supabase SQL Editor, then refresh.</span></div>}
          {activeSection === 'content' ? <WebsiteCMS /> : activeSection === 'overview' ? <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Users',counts.users,FaUserShield,'users'],['Members',counts.members,FaUsers,'members'],['Ministries',new Set((records.members||[]).map(r=>r.ministry).filter(Boolean)).size,FaPrayingHands,'ministries'],['Upcoming events',(records.events||[]).filter(r=>r.published && new Date(r.starts_at)>=new Date()).length,FaCalendarAlt,'events'],['Outreach projects',counts.outreach,FaHandsHelping,'outreach'],
              ].map(([label,value,StatIcon,target]) => <button type="button" onClick={()=>changeSection(target)} className="admin-card admin-stat text-left" key={label}><div><p className="admin-stat-label">{label}</p><p className="admin-stat-value">{value ?? (loadingData?'…':'0')}</p><p className="admin-muted">Live database count · open records</p></div><span className="admin-stat-icon"><StatIcon /></span></button>)}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <section className="admin-card"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Recent contact messages</h2><button className="text-xs font-semibold text-[#009cff]" onClick={()=>changeSection('messages')}>View all</button></div>{(records.messages||[]).slice(0,5).map(row=><button key={row.id} onClick={()=>{setSelectedRecord(row);changeSection('messages');setSelectedRecord(row);}} className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-5 py-3 text-left hover:bg-gray-50"><span><strong className="block text-sm text-[#191c24]">{row.name}</strong><span className="text-xs text-gray-500">{row.subject || row.message}</span></span><span className="shrink-0 text-xs text-gray-400">{formatValue(row.created_at)}</span></button>)}{!records.messages?.length && <div className="admin-empty">No contact messages found.</div>}</section>
              <section className="admin-card"><div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Live database summary</h2></div><div className="p-5 space-y-3">{[['Website posts',counts.content],['Volunteer submissions',counts.volunteers],['Church team',counts.team],['Newsletter subscribers',counts.newsletter],['Donation pledges',counts.pledges]].map(([label,count])=><div className="flex justify-between gap-3 text-sm" key={label}><span className="text-gray-500">{label}</span><strong className="text-[#191c24]">{count ?? '…'}</strong></div>)}</div></section>
            </div>
          </> : activeSection === 'users' ? <UserManagement role={profile?.role} /> : activeSection === 'settings' ? <div className="space-y-5">
            <section className="admin-card overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Administrator account</h2><p className="admin-muted mt-1">Details for the account currently signed in to Tidori administration.</p></div>
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <div className="flex items-center gap-3 sm:col-span-2"><span className="admin-avatar !h-12 !w-12 !text-lg">{initials}</span><div><p className="font-semibold text-[#191c24]">{profile?.full_name || 'Tidori administrator'}</p><p className="text-sm text-gray-500">{user?.email || 'Email unavailable'}</p></div></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Account role</p><p className="mt-1 text-sm font-semibold capitalize text-[#191c24]">{String(profile?.role || 'Not available').replaceAll('_',' ')}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">User ID</p><p className="mt-1 break-all text-sm text-gray-600">{user?.id || 'Not available'}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last sign-in</p><p className="mt-1 text-sm text-gray-600">{formatValue(user?.last_sign_in_at)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Authentication</p><p className="mt-1 text-sm text-gray-600">{user?.app_metadata?.provider || 'Email/password'}</p></div>
              </div>
            </section>
            <PesapalIpnSettings role={profile?.role} />
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="admin-card p-5">
                <div className="mb-3 flex items-center gap-2"><FaUserShield className="text-xl text-[#009cff]" /><h2 className="admin-section-title">Access and security</h2></div>
                <p className="text-sm leading-6 text-gray-600">This private dashboard is restricted to accounts whose Tidori profile role is <strong>admin</strong> or <strong>super_admin</strong>. Your permissions are checked against your signed-in account.</p>
                <div className="mt-4 rounded-lg bg-gray-50 p-4"><p className="text-sm font-semibold text-[#191c24]">Role changes are protected</p><p className="mt-1 text-xs leading-5 text-gray-500">Changing administrator roles is not enabled here. This prevents an administrator from granting themselves or another account elevated access through the dashboard.</p></div>
                <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white"><FaSignOutAlt /> Sign out of this account</button>
              </section>
              <section className="admin-card p-5">
                <div className="mb-3 flex items-center gap-2"><FaChartLine className="text-xl text-[#009cff]" /><h2 className="admin-section-title">Database connection</h2></div>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><p className="text-sm font-semibold text-[#191c24]">{supabaseReady ? 'Supabase client configured' : 'Supabase client not configured'}</p></div>
                <p className="mt-2 text-sm leading-6 text-gray-600">The dashboard reads Tidori member, event, outreach, website content and submission records from the connected Supabase project.</p>
                <div className="mt-4 rounded-lg bg-gray-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Project</p><p className="mt-1 break-all text-sm text-[#191c24]">yrsywklfharhkllrfdun.supabase.co</p><p className="mt-2 text-xs text-gray-500">A configured client does not guarantee that every table is accessible. Database access errors are shown at the top of the dashboard.</p></div>
                <button onClick={loadOverview} disabled={loadingData} className="mt-4 inline-flex items-center gap-2 rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-[#191c24] disabled:opacity-50"><FaSyncAlt className={loadingData ? 'animate-spin' : ''} /> Refresh database records</button>
              </section>
            </div>
            <section className="admin-card p-5">
              <h2 className="admin-section-title">Dashboard information</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-gray-400">Portal</p><p className="mt-1 text-sm font-semibold text-[#191c24]">Tidori Ministries Admin</p></div>
                <div><p className="text-xs text-gray-400">Data source</p><p className="mt-1 text-sm font-semibold text-[#191c24]">Live Supabase records</p></div>
                <div><p className="text-xs text-gray-400">Access type</p><p className="mt-1 text-sm font-semibold text-[#191c24]">Private administrator portal</p></div>
              </div>
            </section>
          </div> : <section className="admin-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">{tableConfig[activeSection]?.title || current.label}</h2><p className="admin-muted mt-1">{activeSection==='ministries'?'Ministry assignments aggregated from member profiles.':'Showing up to 100 most recent database records.'}</p></div>{activeSection!=='ministries' && <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records…" className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#009cff]" />}</div>{renderTable(activeSection)}</section>}
          {selectedRecord && <div className="admin-card mt-5 p-5"><div className="mb-3 flex items-center justify-between"><h2 className="admin-section-title">Record details</h2><button onClick={()=>setSelectedRecord(null)} className="text-sm text-[#009cff]">Close</button></div><div className="grid gap-3 sm:grid-cols-2">{Object.entries(selectedRecord).map(([key,value])=><div key={key} className="min-w-0"><p className="text-xs font-semibold uppercase text-gray-400">{key.replaceAll('_',' ')}</p><p className="break-words text-sm text-[#191c24]">{typeof value==='object' && value!==null ? JSON.stringify(value) : formatValue(value)}</p></div>)}</div></div>}
          <footer className="mt-8 flex flex-wrap justify-between gap-2 text-xs text-gray-400"><span>© {new Date().getFullYear()} Tidori Ministries</span><span>Private administration portal · live database</span></footer>
        </div>
      </main>
    </div>
  );
}


function PesapalIpnSettings({ role }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState([]);

  const requestIpn = async (method = "GET") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch("/api/admin/pesapal/ipn", {
        method,
        headers: { authorization: `Bearer ${token}`, ...(method === "POST" ? { "content-type": "application/json" } : {}) },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMissing(Array.isArray(data.missing) ? data.missing : []);
        throw new Error(data.error || `IPN request failed (HTTP ${response.status}).`);
      }
      setMissing([]);
      setStatus(data);
      setMessage(data.message || (method === "POST" ? "IPN registration completed." : "Pesapal status retrieved."));
    } catch (err) {
      setError(err.message || "Pesapal IPN request failed.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (role === "super_admin") requestIpn("GET");
  }, [role]);

  const copyUrl = async () => {
    const url = status?.url || "https://tidori-ministries.grobaltechtechnologies.workers.dev/api/payments/pesapal/ipn";
    try { await navigator.clipboard.writeText(url); setMessage("Notification URL copied."); }
    catch { setError("Could not copy automatically. Select and copy the notification URL above."); }
  };

  return <section className="admin-card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div><div className="flex items-center gap-2"><FaHandsHelping className="text-lg text-[#009cff]" /><h2 className="admin-section-title">Pesapal IPN configuration</h2></div><p className="admin-muted mt-1">Check Pesapal connectivity and generate or repair the payment notification registration.</p></div>
      {role === "super_admin" && <span className={`admin-pill ${status?.registered ? "text-emerald-700" : ""}`}>{busy ? "Working…" : status?.registered ? "IPN active" : missing.length ? "Configuration required" : "Not yet registered"}</span>}
    </div>
    {role !== "super_admin" ? <div className="p-5 text-sm text-gray-600">Only the Tidori super administrator can configure Pesapal IPN.</div> : <div className="space-y-4 p-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">IPN notification URL</p><button type="button" onClick={copyUrl} className="text-xs font-semibold text-[#009cff]">Copy URL</button></div>
        <p className="mt-1 break-all rounded-lg bg-gray-50 p-3 text-sm text-[#191c24]">{status?.url || "https://tidori-ministries.grobaltechtechnologies.workers.dev/api/payments/pesapal/ipn"}</p>
      </div>
      {missing.length > 0 && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold text-amber-900">Cloudflare configuration is incomplete</p>
        <p className="mt-1 text-sm text-amber-800">Add these missing variables under your Cloudflare Worker settings → Settings → Variables and Secrets. Mark the Pesapal credentials as secrets.</p>
        <ul className="mt-2 list-disc pl-5 text-sm font-mono text-amber-900">{missing.map(key => <li key={key}>{key}</li>)}</ul>
        <p className="mt-2 text-xs leading-5 text-amber-800">For this project, the required Worker values are SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET. Never paste the secret values into this dashboard or public source files. Deploy the Worker after adding them.</p>
      </div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div><p className="text-xs text-gray-400">Configuration</p><p className="mt-1 text-sm font-semibold text-[#191c24]">{missing.length ? "Incomplete" : status?.configured ? "Connected" : "Not verified"}</p></div>
        <div><p className="text-xs text-gray-400">Registration</p><p className="mt-1 text-sm font-semibold text-[#191c24]">{status ? (status.registered ? "Active" : "Not registered / inactive") : "Not checked"}</p></div>
        <div><p className="text-xs text-gray-400">Notification method</p><p className="mt-1 text-sm font-semibold text-[#191c24]">{status?.ipn?.ipn_notification_type_description || status?.ipn?.ipn_notification_type || "GET (expected)"}</p></div>
      </div>
      {status?.ipn?.created_date && <div><p className="text-xs text-gray-400">Registered date</p><p className="mt-1 text-sm font-semibold text-[#191c24]">{formatValue(status.ipn.created_date)}</p></div>}
      {status?.ipn?.ipn_id && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pesapal IPN ID</p><p className="mt-1 break-all text-sm text-gray-700">{status.ipn.ipn_id}</p></div>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => requestIpn("GET")} disabled={busy} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-[#191c24] disabled:opacity-50"><FaSyncAlt className={`mr-2 inline ${busy ? "animate-spin" : ""}`} />Check Pesapal configuration</button>
        <button type="button" onClick={() => requestIpn("POST")} disabled={busy || missing.length > 0} className="rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : status?.registered ? "Repair / verify IPN" : "Generate IPN registration"}</button>
      </div>
      <p className="text-xs leading-5 text-gray-500">The generator checks Pesapal for an existing active notification URL first. It reuses the existing IPN ID where possible and only creates a new registration when needed. Credentials stay in Cloudflare secrets.</p>
    </div>}
  </section>;
}


function UserManagement({ role }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ full_name: "", email: "" });

  const token = async () => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const value = data?.session?.access_token;
    if (!value) throw new Error("Your session has expired. Sign in again.");
    return value;
  };

  const request = async (method = "GET", body) => {
    const accessToken = await token();
    const response = await fetch("/api/admin/users", {
      method,
      headers: { authorization: `Bearer ${accessToken}`, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `User management failed (HTTP ${response.status}).`);
    return data;
  };

  const loadUsers = async () => {
    setLoading(true); setError("");
    try {
      const data = await request("GET");
      setUsers(data.users || []);
    } catch (err) { setError(err.message || "Could not load user accounts."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (role === "super_admin") loadUsers(); else setLoading(false); }, [role]);

  const act = async (id, action) => {
    const labels = { suspend: "suspend this account", unsuspend: "restore this account", reset_password: "send a password reset email", delete: "permanently delete this account" };
    if (!window.confirm(`Are you sure you want to ${labels[action]}?${action === "delete" ? " This cannot be undone." : ""}`)) return;
    setBusyId(id); setError(""); setNotice("");
    try {
      const result = await request("POST", { user_id: id, action });
      setNotice(result.message || "Action completed.");
      await loadUsers();
    } catch (err) { setError(err.message || "The requested action failed."); }
    finally { setBusyId(""); }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setBusyId(editing.id); setError(""); setNotice("");
    try {
      const result = await request("PATCH", {
        user_id: editing.id,
        full_name: editing.full_name,
        email: editing.email,
        phone: editing.phone,
        role: editing.role,
        member_status: editing.member_status,
      });
      setNotice(result.message || "User account updated.");
      setEditing(null);
      await loadUsers();
    } catch (err) { setError(err.message || "Could not update this user."); }
    finally { setBusyId(""); }
  };

  const sendInvite = async (event) => {
    event.preventDefault(); setBusyId("invite"); setError(""); setNotice("");
    try {
      const result = await request("POST", { action: "invite", ...invite });
      setNotice(result.message || "Invitation sent.");
      setInvite({ full_name: "", email: "" }); setInviteOpen(false);
      await loadUsers();
    } catch (err) { setError(err.message || "Could not invite this user."); }
    finally { setBusyId(""); }
  };

  const filtered = users.filter((item) => [item.full_name, item.email, item.phone, item.role, item.member_status].some((value) => String(value || "").toLowerCase().includes(searchTerm.toLowerCase())));
  const fieldClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]";

  if (role !== "super_admin") return <section className="admin-card p-6"><h2 className="admin-section-title">Restricted user management</h2><p className="mt-2 text-sm text-gray-600">Only the Tidori super administrator can invite users, edit account details, change roles, suspend accounts or send password reset emails. You can ask the super administrator to perform these actions.</p></section>;

  return <div className="space-y-5">
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div><h2 className="admin-section-title">Supabase user management</h2><p className="admin-muted mt-1">Manage authentication accounts and their Tidori profile records.</p></div>
        <div className="flex gap-2"><button type="button" onClick={loadUsers} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"><FaSyncAlt className={loading ? "mr-2 inline animate-spin" : "mr-2 inline"} />Refresh</button><button type="button" onClick={() => setInviteOpen(v => !v)} className="rounded-lg bg-[#009cff] px-3 py-2 text-sm font-semibold text-white">Invite user</button></div>
      </div>
      <div className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Total accounts loaded</p><p className="mt-1 text-2xl font-bold text-[#191c24]">{users.length}</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Active accounts</p><p className="mt-1 text-2xl font-bold text-[#191c24]">{users.filter(u => !u.is_banned).length}</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Suspended accounts</p><p className="mt-1 text-2xl font-bold text-[#191c24]">{users.filter(u => u.is_banned).length}</p></div>
      </div>
      {inviteOpen && <form onSubmit={sendInvite} className="grid gap-3 border-b border-gray-100 bg-blue-50/40 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-xs font-semibold text-gray-600">Full name<input className={fieldClass + " mt-1"} required maxLength={120} value={invite.full_name} onChange={e => setInvite(v => ({ ...v, full_name: e.target.value }))} /></label>
        <label className="block text-xs font-semibold text-gray-600">Email address<input className={fieldClass + " mt-1"} type="email" required value={invite.email} onChange={e => setInvite(v => ({ ...v, email: e.target.value }))} /></label>
        <button disabled={busyId === "invite"} className="rounded-lg bg-[#009cff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busyId === "invite" ? "Sending…" : "Send invitation"}</button>
        <p className="text-xs text-gray-500 sm:col-span-3">The invited person receives an email to finish setting up their account. New invitations start with the ordinary member role; elevate permissions only after the account exists.</p>
      </form>}
      {error && <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-sm font-semibold text-[#191c24]">Registered authentication users</p><p className="text-xs text-gray-500">Select Edit to update profile information or account permissions.</p></div><input className={fieldClass + " max-w-sm"} placeholder="Search name, email, phone or role…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[920px]"><thead><tr><th>User</th><th>Phone</th><th>Account role</th><th>Membership</th><th>Last sign-in</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map(item => <tr key={item.id}>
            <td><strong className="block text-[#191c24]">{item.full_name || "Unnamed user"}</strong><span className="text-xs text-gray-500">{item.email}</span></td>
            <td>{item.phone || "—"}</td><td><span className="capitalize">{String(item.role).replaceAll("_"," ")}</span></td><td className="capitalize">{item.member_status || "visitor"}</td><td>{formatValue(item.last_sign_in_at)}</td>
            <td><span className={item.is_banned ? "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700" : "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"}>{item.is_banned ? "Suspended" : item.email_confirmed_at ? "Active" : "Awaiting confirmation"}</span></td>
            <td><div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setEditing({ id:item.id, full_name:item.full_name || "", email:item.email || "", phone:item.phone || "", role:item.role || "member", member_status:item.member_status || "visitor" })} className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold">Edit</button>
              <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, "reset_password")} className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold disabled:opacity-50">Reset password</button>
              <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, item.is_banned ? "unsuspend" : "suspend")} className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold disabled:opacity-50">{item.is_banned ? "Restore" : "Suspend"}</button>
              <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, "delete")} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {!loading && !filtered.length && <div className="admin-empty">No user accounts match this search.</div>}
        {loading && <div className="admin-empty">Loading Supabase authentication users…</div>}
      </div>
    </section>

    {editing && <div className="admin-card p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="admin-section-title">Edit user account</h2><p className="admin-muted mt-1">Changes are saved to Supabase Auth and the Tidori profiles table.</p></div><button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold text-[#009cff]">Close</button></div>
      <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Full name<input className={fieldClass + " mt-1"} required maxLength={120} value={editing.full_name} onChange={e => setEditing(v => ({...v,full_name:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Email address<input className={fieldClass + " mt-1"} type="email" required value={editing.email} onChange={e => setEditing(v => ({...v,email:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Phone<input className={fieldClass + " mt-1"} value={editing.phone} onChange={e => setEditing(v => ({...v,phone:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Account role<select className={fieldClass + " mt-1"} value={editing.role} onChange={e => setEditing(v => ({...v,role:e.target.value}))}><option value="member">Member</option><option value="leader">Leader</option><option value="admin">Administrator</option><option value="super_admin">Super administrator</option></select></label>
        <label className="text-xs font-semibold text-gray-600">Membership status<select className={fieldClass + " mt-1"} value={editing.member_status} onChange={e => setEditing(v => ({...v,member_status:e.target.value}))}><option value="visitor">Visitor</option><option value="member">Member</option><option value="leader">Leader</option></select></label>
        <div className="flex items-end gap-2"><button disabled={busyId === editing.id} className="rounded-lg bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busyId === editing.id ? "Saving…" : "Save changes"}</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold">Cancel</button></div>
        <p className="text-xs leading-5 text-gray-500 sm:col-span-2">Changing an email address is handled by Supabase Auth. Depending on your project’s email security settings, Supabase may require the user to confirm the new address. Never enter or view a user’s existing password here.</p>
      </form>
    </div>}
    <section className="admin-card p-5"><h3 className="text-sm font-bold text-[#191c24]">Security notes</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-gray-500"><li>All management requests are verified server-side against the signed-in super administrator.</li><li>Service-role credentials remain in Cloudflare Worker secrets and are never sent to the browser.</li><li>Password resets send a recovery email; administrators cannot view existing passwords.</li><li>Deleting an account is permanent and removes its Supabase Auth identity; related profile records may be removed by database cascade rules.</li></ul></section>
  </div>;
}
