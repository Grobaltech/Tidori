import { FaSyncAlt } from 'react-icons/fa';
import AdminBreadcrumbs from './AdminBreadcrumbs';

export default function AdminPageHeader({ group, title, loading, onRefresh }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
    <div>
      <AdminBreadcrumbs group={group} title={title} />
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#009cff]">Tidori Ministries</p>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-muted mt-1">Live records from the Tidori Supabase project.</p>
    </div>
    <div className="flex items-center gap-2"><span className="admin-pill">Administrator</span><button onClick={onRefresh} disabled={loading} className="admin-icon-button" title="Refresh live records"><FaSyncAlt className={loading ? 'animate-spin' : ''} /></button></div>
  </div>;
}
