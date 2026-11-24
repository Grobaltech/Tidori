import { Link } from 'react-router-dom';

export default function AdminBreadcrumbs({ group, title }) {
  return <p className="mb-2 text-xs text-gray-400"><Link to="/admin/overview/" className="hover:text-[#009cff]">Admin</Link> <span className="px-1">/</span> {group} <span className="px-1">/</span> <span className="text-[#009cff]">{title}</span></p>;
}
