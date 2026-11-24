import { FaUserShield, FaChartLine, FaSignOutAlt, FaSyncAlt } from 'react-icons/fa';

export default function SettingsPage({ profile, user, initials, supabaseReady, onSignOut, onRefresh, loadingData, PesapalIpnSettings, formatValue }) {
  return <div className="space-y-5">
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
        <button onClick={onSignOut} className="mt-4 inline-flex items-center gap-2 rounded bg-[#009cff] px-4 py-2 text-sm font-semibold text-white"><FaSignOutAlt /> Sign out of this account</button>
      </section>
      <section className="admin-card p-5">
        <div className="mb-3 flex items-center gap-2"><FaChartLine className="text-xl text-[#009cff]" /><h2 className="admin-section-title">Database connection</h2></div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><p className="text-sm font-semibold text-[#191c24]">{supabaseReady ? 'Supabase client configured' : 'Supabase client not configured'}</p></div>
        <p className="mt-2 text-sm leading-6 text-gray-600">The dashboard reads Tidori member, event, outreach, website content and submission records from the connected Supabase project.</p>
        <div className="mt-4 rounded-lg bg-gray-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Project</p><p className="mt-1 break-all text-sm text-[#191c24]">yrsywklfharhkllrfdun.supabase.co</p><p className="mt-2 text-xs text-gray-500">A configured client does not guarantee that every table is accessible. Database access errors are shown at the top of the dashboard.</p></div>
        <button onClick={onRefresh} disabled={loadingData} className="mt-4 inline-flex items-center gap-2 rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-[#191c24] disabled:opacity-50"><FaSyncAlt className={loadingData ? 'animate-spin' : ''} /> Refresh database records</button>
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
  </div>;
}
