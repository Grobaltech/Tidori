import { Link } from 'react-router-dom';
import { FaUserShield } from 'react-icons/fa';

export default function AdminSidebar({ groups, visibleSections, activeSection, sectionPath, onNavigate }) {
  return <>
    <aside className="admin-sidebar">
      <Link to="/" className="admin-brand !gap-3">
        <img src="/img/grok_1793864104245.jpg" alt="Tidori Ministries" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
        <span>TIDORI <small className="block text-[10px] font-semibold tracking-[2px] text-gray-400">ADMINISTRATION</small></span>
      </Link>
      <div className="admin-nav-label">Main menu</div>
      <nav className="admin-nav" aria-label="Administrator navigation">
        {groups.map(group => {
          const items = group.ids.map(id => visibleSections.find(item => item.id === id)).filter(Boolean);
          if (!items.length) return null;
          return <div key={group.label} className="admin-nav-group">
            <div className="admin-nav-label">{group.label}</div>
            {items.map(item => {
              const ItemIcon = item.icon;
              return <Link key={item.id} to={sectionPath(item.id)} className={activeSection === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>
                <span className="admin-nav-icon"><ItemIcon /></span>{item.label}
              </Link>;
            })}
          </div>;
        })}
      </nav>
      <div className="mx-5 mt-8 rounded-lg bg-white p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#191c24]"><FaUserShield className="text-[#009cff]" /> Secure administration</div><p className="m-0 text-xs leading-5 text-gray-400">Access is restricted to authorised Tidori administrators.</p></div>
    </aside>
  </>;
}
