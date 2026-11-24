import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars, FaTimes, FaTachometerAlt, FaUsers, FaPrayingHands, FaCalendarAlt,
  FaHandsHelping, FaNewspaper, FaEnvelope, FaCog, FaSignOutAlt, FaChurch,
  FaUserShield, FaChartLine, FaSearch, FaSyncAlt, FaInbox, FaUserCheck, FaBell, FaUserCircle, FaChevronDown
} from 'react-icons/fa';
import { supabase, supabaseReady } from '../lib/supabase';
import '../admin/admin-theme.css';
import WebsiteCMS from './WebsiteCMS';
import UserAccessControl from './UserAccessControl';
import AppointmentsManager from '../admin/AppointmentsManager';
import TeamManager from '../admin/TeamManager';
import FinancialManager from '../admin/FinancialManager';
import AdminSidebar from '../admin/layout/AdminSidebar';
import AdminPageHeader from '../admin/layout/AdminPageHeader';
import OverviewPage from '../admin/pages/OverviewPage';
import MembersPage from '../admin/pages/MembersPage';
import UserManagementPage from '../admin/pages/UserManagementPage';
import SettingsPage from '../admin/pages/SettingsPage';
import MinistriesPage from '../admin/pages/MinistriesPage';
import EventsPage from '../admin/pages/EventsPage';
import OutreachPage from '../admin/pages/OutreachPage';
import MessagesPage from '../admin/pages/MessagesPage';
import VolunteersPage from '../admin/pages/VolunteersPage';
import NewsletterPage from '../admin/pages/NewsletterPage';
import GivingPledgesPage from '../admin/pages/GivingPledgesPage';

const sections = [
  { id: 'overview', label: 'Dashboard', icon: FaTachometerAlt },
  { id: 'users', label: 'Users', icon: FaUserShield },
  { id: 'access', label: 'Access Control', icon: FaUserShield },
  { id: 'members', label: 'Members', icon: FaUsers },
  { id: 'ministries', label: 'Ministries', icon: FaPrayingHands },
  { id: 'events', label: 'Events', icon: FaCalendarAlt },
  { id: 'appointments', label: 'Pastor appointments', icon: FaCalendarAlt },
  { id: 'finance', label: 'Financial management', icon: FaChartLine },
  { id: 'outreach', label: 'Outreach', icon: FaHandsHelping },
  { id: 'content', label: 'Website CMS', icon: FaNewspaper },
  { id: 'messages', label: 'Messages', icon: FaEnvelope },
  { id: 'settings', label: 'Settings', icon: FaCog },
  { id: 'volunteers', label: 'Volunteers', icon: FaUserCheck },
  { id: 'team', label: 'Church team', icon: FaChurch },
  { id: 'newsletter', label: 'Subscribers', icon: FaInbox },
  { id: 'pledges', label: 'Giving pledges', icon: FaHandsHelping },
];

const sectionSlugs = {
  overview: 'overview',
  users: 'users',
  access: 'access-control',
  members: 'members',
  ministries: 'ministries',
  events: 'events',
  appointments: 'appointments',
  finance: 'giving',
  outreach: 'outreach',
  content: 'website-content',
  messages: 'messages',
  settings: 'settings',
  volunteers: 'volunteers',
  team: 'church-team',
  newsletter: 'newsletter',
  pledges: 'giving-pledges',
};

const sectionGroups = [
  { label: 'Overview', ids: ['overview'] },
  { label: 'People & Access', ids: ['users', 'access', 'members', 'team', 'volunteers'] },
  { label: 'Church Operations', ids: ['ministries', 'events', 'appointments', 'outreach'] },
  { label: 'Communications', ids: ['messages', 'newsletter'] },
  { label: 'Finance', ids: ['finance', 'pledges'] },
  { label: 'Website & Settings', ids: ['content', 'settings'] },
];

const sectionBySlug = Object.fromEntries(
  Object.entries(sectionSlugs).map(([id, slug]) => [slug, id])
);

const sectionFromPath = (pathname) => {
  const slug = pathname.startsWith('/admin/') ? pathname.slice(7).split('/')[0] : '';
  return sectionBySlug[slug] || null;
};

const sectionPath = (id) => `/admin/${sectionSlugs[id] || 'overview'}/`;

const tableConfig = {
  users: { table: 'profiles', title: 'User accounts', columns: [['full_name','Full name'],['email','Email'],['phone','Phone'],['role','Account role'],['member_status','Membership status'],['created_at','Registered']], search: ['full_name','email','phone','role','member_status'] },
  members: { table: 'profiles', title: 'Member records', columns: [['full_name','Full name'],['email','Email'],['phone','Phone'],['role','Account role'],['member_status','Church status'],['created_at','Joined']], search: ['full_name','email','phone','role','member_status'] },
  events: { table: 'events', title: 'Events', columns: [['title','Title'],['location','Location'],['starts_at','Starts'],['published','Published']], search: ['title','location','description'] },
  finance: { table: 'finance_expenses', title: 'Financial management', columns: [['expense_date','Date'],['category','Category'],['description','Description'],['amount','Amount'],['currency','Currency']], search: ['category','description','reference'] },
  appointments: { table: 'appointments', title: 'Pastor appointments', columns: [['full_name','Name'],['phone','Phone'],['appointment_type','Appointment'],['requested_at','Requested date'],['status','Status'],['payment_status','Payment']], search: ['full_name','phone','email','appointment_type','status','payment_status'] },
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
  const location = useLocation();
  const routeSection = sectionFromPath(location.pathname);
  const activeSection = routeSection || 'overview';
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [dataError, setDataError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      else if (!data) setError('Your Tidori profile could not be found.');
      else if (['admin', 'super_admin'].includes(data.role)) setProfile({ ...data, permissions: [] });
      else {
        const { data: permissionRows, error: permissionError } = await supabase.from('user_permissions').select('permission').eq('user_id', auth.user.id);
        if (permissionError) setError('Church access has not been configured yet. Please contact a Tidori administrator.');
        else if (!permissionRows?.length) setError('Your account has not been granted access to this portal. Please contact a Tidori administrator.');
        else setProfile({ ...data, permissions: permissionRows.map(row => row.permission) });
      }
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
      ['appointments', supabase.from('appointments').select('*').order('created_at',{ascending:false}).limit(100)],
      ['outreach', supabase.from('outreach_projects').select('*').order('created_at',{ascending:false}).limit(100)],
      ['content', supabase.from('posts').select('*').order('published_at',{ascending:false}).limit(100)],
      ['messages', supabase.from('contact_messages').select('*').order('created_at',{ascending:false}).limit(100)],
      ['volunteers', supabase.from('volunteers').select('*').order('created_at',{ascending:false}).limit(100)],
      ['team', supabase.from('team_members').select('*').order('sort_order',{ascending:true}).limit(100)],
      ['newsletter', supabase.from('newsletter_subscribers').select('*').order('created_at',{ascending:false}).limit(100)],
      ['pledges', supabase.from('donation_pledges').select('*').order('created_at',{ascending:false}).limit(100)],
    ];
    const isAdministrator = ['admin','super_admin'].includes(profile.role);
    const permissionFor = { users:'users.view', members:'members.view', events:'events.view', appointments:'appointments.view', finance:'giving.view', outreach:'outreach.view', content:'website.manage', messages:'messages.view', volunteers:'volunteers.view', team:'team.view', newsletter:'newsletter.view', pledges:'giving.view' };
    const allowedRequests = requests.filter(([key]) => key === 'appointments' ? isAdministrator : isAdministrator || profile.permissions?.includes(permissionFor[key]) || (key === 'members' && profile.permissions?.includes('ministries.view')));
    const settled = await Promise.all(allowedRequests.map(async ([key, query]) => {
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
  const changeSection = (id, record = null) => { navigate(sectionPath(id)); setSearch(''); setSelectedRecord(record); setSidebarOpen(false); };
  const isAdministrator = ['admin','super_admin'].includes(profile?.role);
  const modulePermission = { users:'users.view', members:'members.view', ministries:'ministries.view', events:'events.view', appointments:'appointments.view', finance:'giving.view', outreach:'outreach.view', content:'website.manage', messages:'messages.view', volunteers:'volunteers.view', team:'team.view', newsletter:'newsletter.view', pledges:'giving.view' };
  const canOpen = (id) => isAdministrator || Boolean(profile?.permissions?.includes(modulePermission[id]));
  const visibleSections = useMemo(() => sections.filter(item => {
    if (item.id === 'appointments' || item.id === 'finance') return isAdministrator;
    if (item.id === 'access') return isAdministrator;
    if (item.id === 'users') return profile?.role === 'super_admin';
    if (item.id === 'overview') return isAdministrator || profile?.permissions?.includes('reports.view');
    return canOpen(item.id);
  }), [profile, isAdministrator]);
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      navigate('/admin/overview/', { replace: true });
      return;
    }
    if (!routeSection) {
      navigate('/admin/overview/', { replace: true });
      return;
    }
    if (!path.endsWith('/')) {
      navigate(`${path}/`, { replace: true });
      return;
    }
    if (profile && !isAdministrator && visibleSections.length && !visibleSections.some(item => item.id === activeSection)) {
      navigate(sectionPath(visibleSections[0].id), { replace: true });
    }
  }, [location.pathname, routeSection, navigate, profile, isAdministrator, visibleSections, activeSection]);

  useEffect(() => {
    setSidebarOpen(false);
    setSearch('');
    const canonical = `${window.location.origin}${sectionPath(activeSection)}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);
    const page = sections.find(item => item.id === activeSection);
    document.title = `${page?.label || 'Dashboard'} | Tidori Ministries Administration`;
  }, [location.pathname, activeSection]);

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

  if (profile && !visibleSections.some(item => item.id === activeSection)) {
    return <div className="min-h-screen grid place-items-center bg-[#f3f6f9] p-5"><div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm"><FaUserShield className="mx-auto mb-4 text-3xl text-[#009cff]" /><h1 className="mb-2 text-xl font-bold text-[#191c24]">Access restricted</h1><p className="mb-5 text-sm text-gray-500">Your account does not have permission to open this administration page.</p>{visibleSections[0] ? <Link className="rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white" to={sectionPath(visibleSections[0].id)}>Return to an authorised page</Link> : <Link className="rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white" to="/">Return to Tidori Ministries</Link>}</div></div>;
  }

  const current = visibleSections.find(s => s.id === activeSection) || visibleSections[0] || sections[0];
  const Icon = current.icon;


  return (
    <div className={`tidori-admin ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <AdminSidebar groups={sectionGroups} visibleSections={visibleSections} activeSection={activeSection} sectionPath={sectionPath} onNavigate={() => { setSearch(""); setSelectedRecord(null); setSidebarOpen(false); }} />      <button className="admin-mobile-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
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
              <button type="button" className="admin-icon-button admin-topbar-action" title="Notifications" aria-label="Notifications" aria-expanded={topbarMenu === 'notifications'} onClick={() => setTopbarMenu(v => v === 'notifications' ? null : 'notifications')}><FaBell />{(records.messages || []).length + (records.volunteers || []).length + (records.pledges || []).length + (records.appointments || []).length > 0 && <span className="admin-topbar-dot" />}</button>
              {topbarMenu === 'notifications' && <div className="admin-dropdown admin-notification-dropdown">
                <div className="admin-dropdown-heading"><strong>Recent activity</strong><span>{(records.messages || []).length + (records.volunteers || []).length + (records.pledges || []).length} records</span></div>
                {[...(records.messages || []).map(row => ({...row, _kind:'messages', _label:'New contact message', _name:row.name || row.email || 'Website visitor'})), ...(records.volunteers || []).map(row => ({...row, _kind:'volunteers', _label:'Volunteer submission', _name:row.name || row.email || 'Applicant'})), ...(records.pledges || []).map(row => ({...row, _kind:'pledges', _label:'Donation pledge', _name:row.name || row.email || 'Contributor'})), ...(records.appointments || []).map(row => ({...row, _kind:'appointments', _label:'Pastor appointment', _name:row.full_name || row.phone || 'Visitor'}))].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0,8).map((row,i) => <button type="button" className="admin-dropdown-item" key={row.id || row._kind + '-' + i} onClick={() => { changeSection(row._kind); setSelectedRecord(row); setTopbarMenu(null); }}><span className="admin-dropdown-item-icon"><FaBell /></span><span className="min-w-0 flex-1"><strong>{row._label}</strong><small>{row._name} · {row.subject || row.message || row.amount || 'Open record'}</small></span><small>{formatValue(row.created_at)}</small></button>)}
                {!records.messages?.length && !records.volunteers?.length && !records.pledges?.length && !records.appointments?.length && <p className="admin-dropdown-empty">You're all caught up. No recent activity.</p>}
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
          <AdminPageHeader group={sectionGroups.find(group => group.ids.includes(activeSection))?.label || "Administration"} title={current.label} loading={loadingData} onRefresh={loadOverview} />
          {dataError && <div role="alert" className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><strong>Some records could not be loaded.</strong> {dataError} <span className="block mt-1">Run the administrator access SQL file supplied with this update in the Tidori Supabase SQL Editor, then refresh.</span></div>}
          {activeSection === 'access' ? <UserAccessControl role={profile?.role} />
            : activeSection === 'appointments' ? <AppointmentsManager canManage={isAdministrator} />
            : activeSection === 'finance' ? <FinancialManager />
            : activeSection === 'team' ? <TeamManager canManage={isAdministrator} />
            : activeSection === 'content' ? <WebsiteCMS />
            : activeSection === 'overview' ? <OverviewPage records={records} counts={counts} loadingData={loadingData} changeSection={changeSection} formatValue={formatValue} />
            : activeSection === 'users' ? <UserManagementPage role={profile?.role} />
            : activeSection === 'members' ? <MembersPage filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'settings' ? <SettingsPage profile={profile} user={user} initials={initials} supabaseReady={supabaseReady} onSignOut={signOut} onRefresh={loadOverview} loadingData={loadingData} PesapalIpnSettings={PesapalIpnSettings} formatValue={formatValue} />
            : activeSection === 'ministries' ? <MinistriesPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'events' ? <EventsPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'outreach' ? <OutreachPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'messages' ? <MessagesPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'volunteers' ? <VolunteersPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'newsletter' ? <NewsletterPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : activeSection === 'pledges' ? <GivingPledgesPage records={records} filteredRecords={filteredRecords} search={search} setSearch={setSearch} loadingData={loadingData} onSelectRecord={setSelectedRecord} tableConfig={tableConfig} formatValue={formatValue} />
            : <section className="admin-card p-5"><p className="text-sm text-gray-500">This administration page is not yet available.</p></section>}
          {selectedRecord && <div className="admin-card mt-5 p-5"><div className="mb-3 flex items-center justify-between"><h2 className="admin-section-title">Record details</h2><button onClick={()=>setSelectedRecord(null)} className="text-sm text-[#009cff]">Close</button></div><div className="grid gap-3 sm:grid-cols-2">{Object.entries(selectedRecord).filter(([key]) => typeof key === 'string' && key.trim().length > 0).map(([key,value])=><div key={key} className="min-w-0 overflow-hidden"><p className="text-xs font-semibold uppercase text-gray-400 break-words">{key.replaceAll('_',' ')}</p><p className="text-sm text-[#191c24] break-words [overflow-wrap:anywhere]">{typeof value==='object' && value!==null ? JSON.stringify(value) : formatValue(value)}</p></div>)}</div></div>}
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
