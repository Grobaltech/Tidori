import { useCallback, useEffect, useState } from 'react';
import { FaCalendarAlt, FaSyncAlt, FaSave, FaTimes, FaPhone, FaEnvelope } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#009cff]';
const statuses = ['requested', 'confirmed', 'completed', 'cancelled'];
const paymentStatuses = ['unpaid', 'paid', 'waived'];
const formatDate = value => {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleString('en-UG', { timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short' });
};
const label = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function AppointmentsManager({ canManage = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rooms, setRooms] = useState({});
  const [roomInvites, setRoomInvites] = useState({});
  const [sessionHistory, setSessionHistory] = useState([]);
  const [roomBusyId, setRoomBusyId] = useState('');
  const [roomError, setRoomError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setError('Appointment service is not configured.'); setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(500);
    if (queryError) setError(queryError.message);
    else {
      setRows(data || []);
      const { data: roomData, error: roomQueryError } = await supabase.from('video_call_rooms').select('id,appointment_id,room_code,status,scheduled_start,scheduled_end').order('created_at', { ascending: false });
      if (!roomQueryError) setRooms(Object.fromEntries((roomData || []).map(room => [room.appointment_id, room])));
      const { data: historyData } = await supabase.from('video_call_sessions')
        .select('id,room_id,started_at,ended_at,ended_reason')
        .order('started_at', { ascending: false }).limit(30);
      setSessionHistory(historyData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async event => {
    event.preventDefault();
    if (!canManage || !editing) return;
    setBusy(true); setError(''); setNotice('');
    const payload = {
      status: editing.status,
      payment_status: editing.payment_status,
      fee_amount: Number(editing.fee_amount || 0),
      currency: editing.currency || 'UGX',
      payment_method: editing.payment_method || null,
      payment_reference: editing.payment_reference || null,
      admin_notes: editing.admin_notes || null,
      confirmed_at: editing.status === 'confirmed' ? (editing.confirmed_at || new Date().toISOString()) : editing.confirmed_at || null,
    };
    const { error: updateError } = await supabase.from('appointments').update(payload).eq('id', editing.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice('Appointment details updated.');
      setEditing(null);
      await load();
    }
    setBusy(false);
  };

  const makeToken = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const hashToken = async token => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const createVideoRoom = async appointment => {
    if (!canManage || appointment.meeting_mode !== 'video' || appointment.status !== 'confirmed') return;
    setRoomBusyId(appointment.id); setRoomError(''); setNotice('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) throw new Error('Your administrator session has expired. Please sign in again.');
      const hostToken = makeToken();
      const guestToken = makeToken();
      const [hostTokenHash, guestTokenHash] = await Promise.all([hashToken(hostToken), hashToken(guestToken)]);
      let room = rooms[appointment.id];
      if (room) {
        const { data, error: rotateError } = await supabase.from('video_call_rooms')
          .update({ host_token_hash: hostTokenHash, guest_token_hash: guestTokenHash, status: 'scheduled', started_at: null, ended_at: null, ended_reason: null })
          .eq('id', room.id)
          .select('id,appointment_id,room_code,status,scheduled_start,scheduled_end')
          .single();
        if (rotateError) throw rotateError;
        room = data;
      } else {
        const { data, error: roomInsertError } = await supabase.from('video_call_rooms').insert({
          appointment_id: appointment.id,
          room_code: crypto.randomUUID(),
          status: 'scheduled',
          scheduled_start: appointment.requested_at || null,
          created_by: authData.user.id,
          host_token_hash: hostTokenHash,
          guest_token_hash: guestTokenHash,
        }).select('id,appointment_id,room_code,status,scheduled_start,scheduled_end').single();
        if (roomInsertError) throw roomInsertError;
        room = data;
        const { error: participantError } = await supabase.from('video_call_participants').insert([
          { room_id: room.id, user_id: authData.user.id, display_name: 'Tidori host', participant_role: 'host', status: 'invited' },
          { room_id: room.id, user_id: null, display_name: appointment.full_name || 'Appointment guest', participant_role: 'guest', status: 'invited' },
        ]);
        if (participantError) {
          await supabase.from('video_call_rooms').delete().eq('id', room.id);
          throw participantError;
        }
      }
      setRooms(current => ({ ...current, [appointment.id]: room }));
      setRoomInvites(current => ({ ...current, [appointment.id]: { hostToken, guestToken } }));
      setNotice('Secure host and visitor links generated. Copy each link and send it only to its intended participant.');
    } catch (err) {
      setRoomError(err.message || 'Could not create secure video-call links. Run the Phase 4 security/history SQL migration first.');
    } finally { setRoomBusyId(''); }
  };

  const copyMeetingLink = async (roomCode, token) => {
    const link = `https://tidori-ministries.grobaltechtechnologies.workers.dev/meeting/${roomCode}#key=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Private invitation link copied. Do not share the host link with the visitor.');
    } catch {
      setRoomError(`Clipboard access failed. Copy this link manually: ${link}`);
    }
  };

  const filtered = rows.filter(row => {
    const matchesFilter = filter === 'all' || (filter === 'paid' ? row.payment_status === 'paid' : filter === 'unpaid' ? row.payment_status !== 'paid' : row.status === filter);
    const text = [row.full_name, row.email, row.phone, row.appointment_type, row.meeting_mode, row.status, row.payment_status].join(' ').toLowerCase();
    return matchesFilter && text.includes(search.toLowerCase());
  });
  const counts = {
    requested: rows.filter(r => r.status === 'requested').length,
    confirmed: rows.filter(r => r.status === 'confirmed').length,
    paid: rows.filter(r => r.payment_status === 'paid').length,
    unpaid: rows.filter(r => r.payment_status !== 'paid').length,
  };

  return <div className="space-y-5">
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div><div className="flex items-center gap-2"><FaCalendarAlt className="text-lg text-[#009cff]" /><h2 className="admin-section-title">Appointments with the Pastor</h2></div><p className="admin-muted mt-1">Review appointment requests, confirm meeting times and record whether the appointment fee has been paid.</p></div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"><FaSyncAlt className={loading ? 'mr-2 inline animate-spin' : 'mr-2 inline'} />Refresh</button>
      </div>
      <div className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-4">
        {[['Awaiting review',counts.requested],['Confirmed',counts.confirmed],['Paid',counts.paid],['Unpaid / waived',counts.unpaid]].map(([name,value]) => <div key={name} className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{name}</p><p className="mt-1 text-2xl font-bold text-[#191c24]">{value}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-3 border-b border-gray-100 p-5">
        <input className={fieldClass + ' min-w-[220px] flex-1'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email or appointment…" />
        <select className={fieldClass + ' sm:max-w-[210px]'} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All appointments</option><option value="requested">Awaiting review</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="paid">Paid</option><option value="unpaid">Unpaid / waived</option>
        </select>
      </div>
      {error && <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {roomError && <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{roomError}</p>}
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[980px]"><thead><tr><th>Visitor</th><th>Appointment</th><th>Meeting mode</th><th>Preferred date & time</th><th>Appointment status</th><th>Payment</th><th>Action</th></tr></thead>
          <tbody>{filtered.map(row => <tr key={row.id}>
            <td><strong className="block text-[#191c24]">{row.full_name}</strong><span className="text-xs text-gray-500">{row.phone}</span>{row.email && <span className="block text-xs text-gray-500">{row.email}</span>}</td>
            <td>{row.appointment_type || 'Pastoral appointment'}{row.notes && <span className="mt-1 block max-w-[220px] text-xs text-gray-500">{row.notes}</span>}</td>
            <td><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">{label(row.meeting_mode || 'in_person')}</span></td>
            <td>{formatDate(row.requested_at)}</td>
            <td><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold capitalize text-blue-700">{label(row.status)}</span></td>
            <td><span className={row.payment_status === 'paid' ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800'}>{label(row.payment_status || 'unpaid')}</span><span className="mt-1 block text-xs text-gray-500">{row.fee_amount ? `${row.currency || 'UGX'} ${Number(row.fee_amount).toLocaleString()}` : 'No fee recorded'}</span></td>
            <td>
              <div className="flex flex-wrap gap-1.5">
                {canManage ? (
                  <>
                    {rooms[row.id] ? (
                      <span className="rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">Saved · View only</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ ...row, fee_amount: row.fee_amount ?? 0, currency: row.currency || 'UGX', payment_status: row.payment_status || 'unpaid' })}
                        className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold"
                      >
                        Manage
                      </button>
                    )}
                    {row.meeting_mode === 'video' && row.status === 'confirmed' && (
                      <>
                        {rooms[row.id] && (
                          <span className={`rounded px-2 py-1 text-xs font-semibold ${rooms[row.id].status === 'live' ? 'bg-emerald-50 text-emerald-700' : rooms[row.id].status === 'ended' ? 'bg-gray-100 text-gray-600' : 'bg-violet-50 text-violet-700'}`}>
                            {label(rooms[row.id].status || 'scheduled')}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={roomBusyId === row.id}
                          onClick={() => createVideoRoom(row)}
                          className="rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {roomBusyId === row.id ? 'Preparing…' : rooms[row.id] ? 'Generate secure links' : 'Create room'}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-gray-400">View only</span>
                )}
              </div>
              {rooms[row.id] && (
                <div className="mt-2 max-w-[260px] space-y-1 text-xs text-gray-500">
                  <span className="block break-all font-mono">Room: {rooms[row.id].room_code}</span>
                  {roomInvites[row.id] ? (
                    <>
                      <a href={`https://tidori.grobaltechtechnologies.workers.dev/meeting/${rooms[row.id].room_code}#key=${roomInvites[row.id].hostToken}`} target="_blank" rel="noopener noreferrer" className="block font-semibold text-violet-700 underline">Open pastor / host meeting</a>
                      <button type="button" onClick={() => copyMeetingLink(rooms[row.id].room_code, roomInvites[row.id].guestToken)} className="block font-semibold text-[#009cff]">Copy visitor link</button>
                    </>
                  ) : (
                    <span className="block text-amber-700">Private links are hidden after refresh. Generate new links to rotate access.</span>
                  )}
                </div>
              )}
            </td>
          </tr>)}</tbody>
        </table>
        {!loading && !filtered.length && <div className="admin-empty">No appointment requests match this view.</div>}
        {loading && <div className="admin-empty">Loading appointment requests…</div>}
      </div>
    </section>

    {sessionHistory.length > 0 && <section className="admin-card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Video call history</h2><p className="admin-muted mt-1">Recent completed and active sessions. Meeting links and access tokens are not shown here.</p></div>
      <div className="overflow-x-auto"><table className="admin-table w-full min-w-[720px]"><thead><tr><th>Visitor</th><th>Room</th><th>Started</th><th>Ended</th><th>Duration</th><th>End reason</th></tr></thead><tbody>
        {sessionHistory.map(session => {
          const room = Object.values(rooms).find(item => item.id === session.room_id);
          const appointment = rows.find(item => item.id === room?.appointment_id);
          const duration = session.ended_at ? Math.max(0, Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000)) + ' min' : 'In progress';
          return <tr key={session.id}><td>{appointment?.full_name || 'Appointment guest'}</td><td className="font-mono text-xs">{room?.room_code || '—'}</td><td>{formatDate(session.started_at)}</td><td>{formatDate(session.ended_at)}</td><td>{duration}</td><td>{label(session.ended_reason || (session.ended_at ? 'ended' : 'live'))}</td></tr>;
        })}
      </tbody></table></div>
    </section>}
    {editing && <section className="admin-card p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="admin-section-title">Manage appointment</h2><p className="admin-muted mt-1">{editing.full_name} · Requested {formatDate(editing.created_at)}</p></div><button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold text-[#009cff]"><FaTimes className="mr-1 inline" />Close</button></div>
      <div className="mb-4 grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
        <p className="text-sm"><FaPhone className="mr-2 inline text-gray-400" />{editing.phone || 'No phone provided'}</p>
        <p className="text-sm"><FaEnvelope className="mr-2 inline text-gray-400" />{editing.email || 'No email provided'}</p>
        <p className="text-sm sm:col-span-2"><strong>Request:</strong> {editing.appointment_type} · {formatDate(editing.requested_at)}</p>
        <p className="text-sm sm:col-span-2"><strong>Meeting preference:</strong> {label(editing.meeting_mode || 'in_person')}</p>
        {editing.notes && <p className="text-sm sm:col-span-2"><strong>Details:</strong> {editing.notes}</p>}
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Appointment status<select className={fieldClass + ' mt-1'} value={editing.status} onChange={e => setEditing(v => ({...v,status:e.target.value}))}>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Payment status<select className={fieldClass + ' mt-1'} value={editing.payment_status} onChange={e => setEditing(v => ({...v,payment_status:e.target.value}))}>{paymentStatuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Appointment fee<input className={fieldClass + ' mt-1'} type="number" min="0" step="0.01" value={editing.fee_amount} onChange={e => setEditing(v => ({...v,fee_amount:e.target.value}))} /></label>
        <label className="text-xs font-semibold text-gray-600">Currency<select className={fieldClass + ' mt-1'} value={editing.currency} onChange={e => setEditing(v => ({...v,currency:e.target.value}))}><option value="UGX">UGX</option><option value="USD">USD</option></select></label>
        <label className="text-xs font-semibold text-gray-600">Payment method<input className={fieldClass + ' mt-1'} maxLength="80" value={editing.payment_method || ''} onChange={e => setEditing(v => ({...v,payment_method:e.target.value}))} placeholder="Cash, mobile money, bank…" /></label>
        <label className="text-xs font-semibold text-gray-600">Payment reference<input className={fieldClass + ' mt-1'} maxLength="120" value={editing.payment_reference || ''} onChange={e => setEditing(v => ({...v,payment_reference:e.target.value}))} placeholder="Receipt or transaction reference" /></label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Administrator notes<textarea className={fieldClass + ' mt-1 min-h-20'} maxLength="2000" value={editing.admin_notes || ''} onChange={e => setEditing(v => ({...v,admin_notes:e.target.value}))} placeholder="Internal notes about this appointment…" /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-[#009cff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FaSave className="mr-2 inline" />{busy ? 'Saving…' : 'Save appointment'}</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold">Cancel</button></div>
      </form>
      <p className="mt-3 text-xs leading-5 text-gray-500">Payment status is an administrator-recorded confirmation. Mark an appointment as paid only after verifying the payment or receipt. This does not initiate a Pesapal charge.</p>
    </section>}
  </div>;
}
