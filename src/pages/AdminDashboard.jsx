import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBars, FaTimes, FaTachometerAlt, FaUsers, FaPrayingHands, FaCalendarAlt,
  FaHandsHelping, FaNewspaper, FaEnvelope, FaCog, FaSignOutAlt, FaChurch,
  FaUserShield, FaChartLine, FaArrowUp, FaSearch
} from 'react-icons/fa';
import { supabase, supabaseReady } from '../lib/supabase';
import '../admin/admin-theme.css';

const sections = [
  { id: 'overview', label: 'Dashboard', icon: FaTachometerAlt },
  { id: 'members', label: 'Members', icon: FaUsers },
  { id: 'ministries', label: 'Ministries', icon: FaPrayingHands },
  { id: 'events', label: 'Events', icon: FaCalendarAlt },
  { id: 'outreach', label: 'Outreach', icon: FaHandsHelping },
  { id: 'content', label: 'Website content', icon: FaNewspaper },
  { id: 'messages', label: 'Messages', icon: FaEnvelope },
  { id: 'settings', label: 'Settings', icon: FaCog },
];

const sectionDescriptions = {
  members: 'Manage church member records, membership status and leaders.',
  ministries: 'Organise ministry teams and their activities.',
  events: 'Manage church events, schedules and registrations.',
  outreach: 'Review outreach projects and giving activity.',
  content: 'Manage public website content without changing the public website design.',
  messages: 'Review contact and volunteer submissions.',
  settings: 'Manage administrator access and church settings.',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

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

  const initials = useMemo(() => (profile?.full_name || user?.email || 'A').slice(0, 1).toUpperCase(), [profile, user]);
  const signOut = async () => { await supabase.auth.signOut(); navigate('/login'); };

  if (checking) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Checking administrator access…</div>;
  if (error) return <div className="min-h-screen grid place-items-center bg-[#f3f6f9] p-5"><div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm"><FaUserShield className="mx-auto mb-4 text-3xl text-[#009cff]" /><h1 className="mb-2 text-xl font-bold text-[#191c24]">Administrator access</h1><p className="mb-5 text-sm text-gray-500">{error}</p><div className="flex justify-center gap-3"><Link className="rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white" to="/profile">My profile</Link><button onClick={signOut} className="rounded border px-4 py-2 text-sm">Sign out</button></div></div></div>;

  const current = sections.find(s => s.id === activeSection) || sections[0];
  const Icon = current.icon;
  return (
    <div className={`tidori-admin ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand"><span className="admin-brand-mark"><FaChurch /></span><span>TIDORI <small className="block text-[10px] font-semibold tracking-[2px] text-gray-400">ADMINISTRATION</small></span></Link>
        <div className="admin-nav-label">Main menu</div>
        <nav className="admin-nav" aria-label="Administrator navigation">
          {sections.map(item => { const ItemIcon = item.icon; return <button key={item.id} className={activeSection === item.id ? 'active' : ''} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}><span className="admin-nav-icon"><ItemIcon /></span>{item.label}</button>; })}
        </nav>
        <div className="mx-5 mt-8 rounded-lg bg-white p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#191c24]"><FaUserShield className="text-[#009cff]" /> Secure administration</div><p className="m-0 text-xs leading-5 text-gray-400">Access is restricted to authorised Tidori administrators.</p></div>
      </aside>
      <button className="admin-mobile-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="flex items-center gap-3"><button className="admin-icon-button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(v => !v)}>{sidebarOpen ? <FaTimes /> : <FaBars />}</button><div className="hidden sm:block"><div className="text-sm font-bold text-[#191c24]">Administration</div><div className="text-xs text-gray-400">Tidori Ministries</div></div></div>
          <div className="flex items-center gap-4"><span className="hidden items-center gap-2 text-xs text-gray-400 md:flex"><FaSearch /> Management workspace</span><div className="admin-profile"><span className="admin-avatar">{initials}</span><span className="hidden sm:block">{profile?.full_name || user?.email}</span></div><button className="admin-icon-button" title="Sign out" aria-label="Sign out" onClick={signOut}><FaSignOutAlt /></button></div>
        </header>
        <div className="admin-content">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#009cff]">Tidori Ministries</p><h1 className="admin-page-title">{current.label}</h1><p className="admin-muted mt-1">Welcome to your administration workspace.</p></div><span className="admin-pill">Administrator</span></div>
          {activeSection === 'overview' ? <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Members','—',FaUsers],['Ministries','—',FaPrayingHands],['Upcoming events','—',FaCalendarAlt],['Outreach projects','—',FaHandsHelping]
              ].map(([label,value,StatIcon]) => <div className="admin-card admin-stat" key={label}><div><p className="admin-stat-label">{label}</p><p className="admin-stat-value">{value}</p><p className="admin-muted">Live records will appear here</p></div><span className="admin-stat-icon"><StatIcon /></span></div>)}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <section className="admin-card"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Recent activity</h2><span className="admin-pill">Live data pending</span></div><div className="admin-empty"><FaChartLine className="mx-auto mb-3 text-2xl text-[#009cff]" /><p className="m-0">Activity records will appear here when the administration data modules are connected.</p></div></section>
              <section className="admin-card"><div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Administration overview</h2></div><div className="p-5"><div className="mb-4 flex items-center gap-3"><span className="admin-stat-icon"><FaUserShield /></span><div><p className="m-0 text-sm font-bold text-[#191c24]">Access protected</p><p className="admin-muted m-0">Signed in as an authorised administrator</p></div></div><div className="rounded bg-[#f3f6f9] p-3 text-xs leading-5 text-gray-500">The dashboard design is separate from the public Tidori website. Existing public pages and member profile styling are unchanged.</div></div></section>
            </div>
          </> : <section className="admin-card"><div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4"><span className="admin-stat-icon"><Icon /></span><h2 className="admin-section-title">{current.label}</h2></div><div className="admin-empty"><p className="mb-2 font-semibold text-[#191c24]">{current.label} workspace</p><p className="m-0">{sectionDescriptions[activeSection]}</p><p className="mt-3">This section's data and actions will be connected in the next implementation stage.</p></div></section>}
          <footer className="mt-8 flex flex-wrap justify-between gap-2 text-xs text-gray-400"><span>© {new Date().getFullYear()} Tidori Ministries</span><span>Private administration portal</span></footer>
        </div>
      </main>
    </div>
  );
}
