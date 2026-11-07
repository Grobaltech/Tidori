import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaTimes, FaArrowRight } from 'react-icons/fa';
import { getEvents, getMinistries, getOutreach, getPosts, getTeam } from '../lib/api';

export default function SearchPanel({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    inputRef.current?.focus();
    let active = true;
    setLoading(true);
    Promise.all([getPosts(), getEvents(), getMinistries(), getOutreach(), getTeam()])
      .then(([posts, events, ministries, outreach, team]) => {
        if (!active) return;
        setItems([
          ...posts.map((item) => ({ title: item.title, description: item.excerpt || item.body, type: 'Blog', to: item.slug ? `/blog/${item.slug}` : '/blog' })),
          ...events.map((item) => ({ title: item.title, description: item.description || item.location, type: 'Event', to: '/events' })),
          ...ministries.map((item) => ({ title: item.title, description: item.description || item.text, type: 'Ministry', to: '/ministries' })),
          ...outreach.map((item) => ({ title: item.title, description: item.summary || item.description, type: 'Outreach', to: '/outreach' })),
          ...team.map((item) => ({ title: item.name, description: item.role, type: 'Our Team', to: '/team' })),
          { title: 'About Tidori Ministries', description: 'Learn about our church, mission and vision.', type: 'Page', to: '/about' },
          { title: 'Contact Us', description: 'Get in touch with Tidori Ministries.', type: 'Page', to: '/contact' },
          { title: 'Give', description: 'Support the work and outreach of the ministry.', type: 'Page', to: '/give' },
          { title: 'Volunteer', description: 'Find ways to serve with us.', type: 'Page', to: '/volunteer' },
        ]);
      })
      .catch((error) => console.error('Website search could not load content:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return items.filter((item) =>
      `${item.title || ''} ${item.description || ''} ${item.type || ''}`.toLocaleLowerCase().includes(term)
    ).slice(0, 8);
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-50 w-full border-t border-white/10 bg-ink shadow-2xl" role="search">
      <div className="container-page py-5">
        <div className="flex items-center gap-3 border-b border-white/30 pb-3">
          <FaSearch className="shrink-0 text-gold" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sermons, events, ministries, outreach..."
            aria-label="Search the Tidori Ministries website"
            className="w-full bg-transparent py-2 text-white outline-none placeholder:text-white/50"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="p-2 text-white hover:text-gold">
            <FaTimes />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto pt-3">
          {!query.trim() && <p className="py-3 text-sm text-white/60">Start typing to search the website.</p>}
          {loading && <p className="py-3 text-sm text-white/70">Loading website content...</p>}
          {query.trim() && !loading && results.length === 0 && (
            <p className="py-3 text-sm text-white/70">No results found for “{query.trim()}”. Try another keyword.</p>
          )}
          {results.map((item, index) => (
            <Link
              key={`${item.type}-${item.title}-${index}`}
              to={item.to}
              onClick={onClose}
              className="group flex items-center justify-between gap-4 border-b border-white/10 px-2 py-3 text-white transition-colors hover:bg-white/5"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold group-hover:text-gold">{item.title}</span>
                <span className="mt-1 block truncate text-sm text-white/60">{item.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-gold">
                {item.type}<FaArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
