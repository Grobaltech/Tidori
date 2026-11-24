import { useEffect, useState } from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

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

export default function UserManagementPage({ role }) {
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

