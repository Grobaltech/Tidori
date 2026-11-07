import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaTwitter, FaFacebookF, FaYoutube,
  FaInstagram, FaLinkedinIn, FaChevronUp, FaChevronDown, FaBars, FaTimes, FaAngleRight, FaSearch, FaUserCircle,
} from 'react-icons/fa';
import { site } from '../config/site';
import { useScrollY, useAsync } from '../hooks/hooks';
import { getSiteContent } from '../lib/api';
import NewsletterForm from './NewsletterForm';
import SearchPanel from './SearchPanel';
import { supabase, supabaseReady } from '../lib/supabase';

const socials = [
  ['facebook', FaFacebookF], ['twitter', FaTwitter], ['youtube', FaYoutube],
  ['instagram', FaInstagram], ['linkedin', FaLinkedinIn],
];

function Socials({ button, siteData = site }) {
  return (
    <div className="flex gap-2">
      {socials.map(([key, Icon]) =>
        siteData.social[key] ? (
          <a key={key} href={siteData.social[key]} target="_blank" rel="noreferrer" aria-label={key}
             className={button ? 'btn-custom btn-light !px-3 !py-2 !text-sm' : 'text-white hover:text-gold px-2'}>
            <Icon />
          </a>
        ) : null
      )}
    </div>
  );
}

function TopBar() {
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  return (
    <div className="top-bar hidden border-b border-white/30 bg-ink md:block">
      <div className="mx-auto flex h-11 max-w-wide items-center justify-between px-4 text-white">
        <div className="flex h-full items-center">
          <span className="flex h-full items-center border-l border-white/30 px-3 text-sm">
            <FaPhoneAlt className="mr-2 text-gold" /> {activeSite.phone}
          </span>
          <span className="flex h-full items-center border-x border-white/30 px-3 text-sm">
            <FaEnvelope className="mr-2 text-gold" /> {activeSite.email}
          </span>
        </div>
        <Socials siteData={activeSite} />
      </div>
    </div>
  );
}

function Navbar() {
  const y = useScrollY();
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); setSub(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  const link = ({ isActive }) =>
    `block px-4 py-2 text-white hover:text-gold ${isActive ? 'text-gold' : ''}`;

  const navItems = activeSite.nav.some(item => item.to === '/appointments')
    ? activeSite.nav
    : activeSite.nav.flatMap(item => item.to === '/contact'
      ? [{ to: '/appointments', label: 'Appointments' }, item]
      : [item]);

  return (
    <header className={`sticky top-0 z-50 bg-ink transition-shadow ${y > 0 ? 'shadow-lg shadow-black/30' : ''}`}>
      <div className="mx-auto flex max-w-wide items-center justify-between px-4 py-3">
        <Link to="/" aria-label="Tidori Ministries home" className="flex items-center">
          <img src={activeSite.logoUrl || "/img/grok_1793864104245.jpg"} alt={activeSite.name || "Tidori Ministries"} className="h-14 w-auto max-w-[190px] object-contain sm:h-16" />
        </Link>
        <nav className={`${open ? 'block' : 'hidden'} absolute left-0 top-full w-full bg-ink px-4 pb-4 lg:static lg:block lg:w-auto lg:p-0`}>
          <ul className="flex flex-col lg:flex-row lg:items-center">
            {navItems.map((item) =>
              item.children ? (
                <li key={item.label} className="group relative">
                  <button className="flex w-full items-center px-4 py-2 text-white hover:text-gold" onClick={() => setSub(!sub)}>
                    {item.label} <FaChevronDown className="ml-2 text-xs" />
                  </button>
                  <ul className={`${sub ? 'block' : 'hidden'} lg:absolute lg:left-0 lg:top-full lg:hidden lg:min-w-[220px] lg:bg-ink lg:group-hover:block lg:shadow-lg`}>
                    {item.children.map((c) => (
                      <li key={c.to}><NavLink to={c.to} className={link}>{c.label}</NavLink></li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.to}><NavLink to={item.to} end={item.to === '/'} className={link}>{item.label}</NavLink></li>
              )
            )}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setSearchOpen((value) => !value)} aria-label={searchOpen ? "Close search" : "Open search"} aria-expanded={searchOpen} className={`p-2 text-xl transition-colors hover:text-gold ${searchOpen ? "text-gold" : "text-white"}`}>
            {searchOpen ? <FaTimes /> : <FaSearch />}
          </button>
          <Link to={signedIn ? "/profile" : "/login"} aria-label={signedIn ? "My account" : "Login or register"} title={signedIn ? "My account" : "Login / Register"} className="p-2 text-xl text-white transition-colors hover:text-gold">
            <FaUserCircle />
          </Link>
          <button className="p-2 text-2xl text-white lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function Footer() {
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  const links = (arr) => arr.map(([to, label]) => (
    <Link key={label} to={to} className="mb-2 flex items-center text-white hover:text-gold">
      <FaAngleRight className="mr-2" /> {label}
    </Link>
  ));
  return (
    <footer className="footer mt-11 bg-ink pt-20 text-white">
      <div className="container-page grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={activeSite.logoUrl || "/img/grok_1793864104245.jpg"} alt={activeSite.name || "Tidori Ministries"} className="mb-6 h-16 w-auto max-w-[190px] object-contain" />
          <h2 className="mb-6 text-[22px] font-bold !text-gold">Our Church</h2>
          <p className="mb-2 flex items-center"><FaMapMarkerAlt className="mr-3 text-gold" /> {activeSite.address}</p>
          <p className="mb-2 flex items-center"><FaPhoneAlt className="mr-3 text-gold" /> {activeSite.phone}</p>
          <p className="mb-4 flex items-center"><FaEnvelope className="mr-3 text-gold" /> {activeSite.email}</p>
          <Socials button siteData={activeSite} />
        </div>
        <div>
          <h2 className="mb-6 text-[22px] font-bold !text-gold">Quick Links</h2>
          {links([['/about', 'About Us'], ['/contact', 'Contact Us'], ['/outreach', 'Outreach'], ['/events', 'Upcoming Events'], ['/blog', 'Latest Blog']])}
        </div>
        <div>
          <h2 className="mb-6 text-[22px] font-bold !text-gold">Get Involved</h2>
          {links([['/give', 'Give'], ['/volunteer', 'Serve With Us'], ['/ministries', 'Our Ministries'], ['/team', 'Our Leaders']])}
        </div>
        <div>
          <h2 className="mb-6 text-[22px] font-bold !text-gold">Newsletter</h2>
          <NewsletterForm />
        </div>
      </div>
      <div className="container-page mt-4 flex flex-col justify-between gap-2 border-t border-white/10 py-6 text-sm md:flex-row">
        <p>&copy; {new Date().getFullYear()} <Link to="/" className="text-gold">{activeSite.name}</Link>. All rights reserved.</p>
        {/* Attribution required by the template's CC BY 4.0 license - do not remove */}
        <p>Designed by <a href="https://htmlcodex.com" target="_blank" rel="noreferrer" className="text-gold">HTML Codex</a></p>
      </div>
    </footer>
  );
}

function BackToTop() {
  const y = useScrollY();
  if (y < 200) return null;
  return (
    <button aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center bg-gold text-navy hover:bg-navy hover:text-gold">
      <FaChevronUp />
    </button>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="fade-in" key={pathname}><Outlet /></main>
      <Footer />
      <BackToTop />
    </>
  );
}
