import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseReady } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import LocationPicker from '../components/LocationPicker';

const emptyProfile = {
  full_name: '', phone: '', photo_url: '', member_status: 'visitor', join_date: '',
  small_group: '', ministry: '', areas_served: [], newsletter_opt_in: false,
  prayer_request_visibility: 'leaders', directory_opt_in: false,
  birthday_month: '', birthday_day: '', address: '', place_of_origin: {}, current_address: {},
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState('');
  const [messageError, setMessageError] = useState('');
  const [testRoomBusy, setTestRoomBusy] = useState(false);
  const [testRoom, setTestRoom] = useState(null);
  const [videoTestError, setVideoTestError] = useState('');

  useEffect(() => {
    if (!supabaseReady) { setBusy(false); return; }
    let active = true;
    const load = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) { navigate('/login'); return; }
      setUser(authData.user);
      const { data, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
      if (!active) return;
      if (profileError) {
        setError(profileError.message);
      } else if (data) {
        setProfile({
          ...emptyProfile,
          ...data,
          join_date: data.join_date || '',
          birthday_month: data.birthday_month || '',
          birthday_day: data.birthday_day || '',
          areas_served: data.areas_served || [],
          place_of_origin: data.place_of_origin || {},
          current_address: data.current_address || {},
        });
      } else {
        setError('Your member profile has not been created yet. Please contact the church administrator.');
      }
      setBusy(false);
    };
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (!session) navigate('/login');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [navigate]);

  const change = (key, value) => setProfile(current => ({ ...current, [key]: value }));

  const updatePassword = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (newPassword.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('The passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      setRecovering(false); setNewPassword(''); setConfirmPassword('');
      setMessage('Your password has been changed successfully.');
    } catch (err) {
      console.error('Tidori password update failed:', err);
      setError(err.message || 'Could not update your password. Please request a new reset link.');
    } finally { setSaving(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const updates = {
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim() || null,
        small_group: profile.small_group.trim() || null,
        ministry: profile.ministry.trim() || null,
        areas_served: profile.areas_served,
        newsletter_opt_in: profile.newsletter_opt_in,
        prayer_request_visibility: profile.prayer_request_visibility,
        directory_opt_in: profile.directory_opt_in,
        birthday_month: profile.birthday_month ? Number(profile.birthday_month) : null,
        birthday_day: profile.birthday_day ? Number(profile.birthday_day) : null,
        address: profile.address?.trim() || null,
        place_of_origin: profile.place_of_origin || {},
        current_address: profile.current_address || {},
        updated_at: new Date().toISOString(),
      };
      const { error: saveError } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (saveError) throw saveError;
      setMessage('Your member profile has been saved.');
      setEditingProfile(false);
    } catch (err) { setError(err.message || 'Could not save your profile.'); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG or WebP image.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('The photo must be 5 MB or smaller.'); return; }
    setUploading(true); setError(''); setMessage('');
    try {
      const extension = file.name.split('.').pop().toLowerCase();
      const path = `${user.id}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from('member-avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('member-avatars').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles')
        .update({ photo_url: data.publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (updateError) throw updateError;
      change('photo_url', data.publicUrl);
      setMessage('Profile photo updated.');
    } catch (err) { setError(err.message || 'Photo upload failed.'); }
    finally { setUploading(false); event.target.value = ''; }
  };

  const sendMemberMessage = async (e) => {
    e.preventDefault();
    setSendingMessage(true); setMessageSent(''); setMessageError('');
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        name: profile.full_name.trim() || user.email,
        email: user.email,
        subject: contactSubject.trim() || 'Message from member portal',
        message: contactMessage.trim(),
      });
      if (insertError) throw insertError;
      setContactSubject('');
      setContactMessage('');
      setMessageSent('Your message has been sent to the Tidori administration team.');
    } catch (err) {
      setMessageError(err.message || 'Your message could not be sent. Please try again.');
    } finally { setSendingMessage(false); }
  };

  const makeVideoToken = () => Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    byte => byte.toString(16).padStart(2, '0')
  ).join('');

  const hashVideoToken = async token => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const createVideoTestRoom = async (mode = 'video') => {
    if (!user) return;
    setTestRoomBusy(true); setVideoTestError(''); setMessage('');
    try {
      const hostToken = makeVideoToken();
      const guestToken = makeVideoToken();
      const [hostTokenHash, guestTokenHash] = await Promise.all([
        hashVideoToken(hostToken), hashVideoToken(guestToken)
      ]);
      const { data: room, error: roomError } = await supabase.from('video_call_rooms').insert({
        appointment_id: null,
        owner_user_id: user.id,
        is_test: true,
        call_mode: mode,
        room_code: crypto.randomUUID(),
        status: 'scheduled',
        created_by: user.id,
        host_token_hash: hostTokenHash,
        guest_token_hash: guestTokenHash,
      }).select('id,room_code,status,created_at').single();
      if (roomError) throw roomError;

      const { error: participantError } = await supabase.from('video_call_participants').insert([
        { room_id: room.id, user_id: user.id, display_name: profile.full_name || user.email || 'Tidori member', participant_role: 'host', status: 'invited' },
        { room_id: room.id, user_id: null, display_name: `${mode === 'audio' ? 'Audio' : 'Video'} test guest`, participant_role: 'guest', status: 'invited' },
      ]);
      if (participantError) throw participantError;

      const base = window.location.origin;
      setTestRoom({
        ...room,
        call_mode: mode,
        hostLink: `${base}/meeting/${room.room_code}?mode=${mode}#key=${hostToken}`,
        guestLink: `${base}/meeting/${room.room_code}?mode=${mode}#key=${guestToken}`,
      });
    } catch (err) {
      setVideoTestError(err.message || 'Could not create a video test room. Confirm the member video-call SQL migration has been run.');
    } finally {
      setTestRoomBusy(false);
    }
  };

  const logout = async () => { await supabase.auth.signOut(); navigate('/'); };

  if (busy) return <div className="container-page py-20 text-center">Loading your profile...</div>;
  if (!supabaseReady) return <div className="container-page py-20 text-center">Account services are not configured.</div>;
  if (!user) return null;

  return <>
    <PageHeader title="My Profile" />
    <div className="container-page max-w-3xl pt-8">
      <Link to="/community" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-ink px-5 py-4 text-white shadow-sm hover:bg-navy">
        <span><strong className="block text-lg text-gold">Open Tidori Connect</strong><span className="text-sm text-white/80">Find church members, send private messages and share prayer requests.</span></span>
        <span className="font-semibold text-gold">Open community →</span>
      </Link>
    </div>
    <section className="container-page max-w-3xl py-12">
      <div className="bg-mist p-6 sm:p-10">
        {recovering ? <div className="mx-auto max-w-lg">
          <h1 className="mb-3 text-3xl">Choose a new password</h1>
          <p className="mb-6 text-sm text-gray-600">Enter and confirm your new Tidori account password.</p>
          <form onSubmit={updatePassword} className="space-y-4">
            <label className="block text-sm font-semibold text-navy">New password<input className="field mt-2" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
            <label className="block text-sm font-semibold text-navy">Confirm new password<input className="field mt-2" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {message && <p role="status" className="text-sm text-green-700">{message}</p>}
            <button type="submit" className="btn-custom w-full" disabled={saving}>{saving ? 'Updating password...' : 'Update Password'}</button>
          </form>
        </div> : <><div className="mb-8 flex flex-wrap items-center gap-5">
          {profile.photo_url
            ? <img src={profile.photo_url} alt="Your profile" className="h-24 w-24 rounded-full object-cover" />
            : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-3xl text-gray-500">{profile.full_name?.charAt(0) || 'T'}</div>}
          <div>
            <h1 className="text-3xl">Your member profile</h1>
            <p className="mt-1 break-all text-sm text-gray-600">{user.email}</p>
            <label className="mt-3 inline-block cursor-pointer text-sm font-semibold text-navy underline">
              {uploading ? 'Uploading photo...' : 'Upload profile photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={uploadPhoto} />
            </label>
          </div>
        </div>

        {!editingProfile ? <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-semibold text-navy">Your profile details</h2><p className="mt-1 text-sm text-gray-500">Your saved information is shown here. You can update it whenever necessary.</p></div>
            <button type="button" onClick={() => { setEditingProfile(true); setMessage(''); setError(''); }} className="btn-custom">Edit profile</button>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Full name</dt><dd className="mt-1 text-sm text-gray-900">{profile.full_name || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-900">{profile.phone || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Membership status</dt><dd className="mt-1 text-sm capitalize text-gray-900">{profile.member_status || 'Visitor'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Join date</dt><dd className="mt-1 text-sm text-gray-900">{profile.join_date || 'Not recorded'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Small group</dt><dd className="mt-1 text-sm text-gray-900">{profile.small_group || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Ministry</dt><dd className="mt-1 text-sm text-gray-900">{profile.ministry || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Areas served</dt><dd className="mt-1 text-sm text-gray-900">{profile.areas_served?.length ? profile.areas_served.join(', ') : 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Place of origin</dt><dd className="mt-1 text-sm text-gray-900">{[profile.place_of_origin?.country, profile.place_of_origin?.region, profile.place_of_origin?.district, profile.place_of_origin?.county, profile.place_of_origin?.subcounty, profile.place_of_origin?.parish, profile.place_of_origin?.village].filter(v => v && v !== 'Not applicable').join(', ') || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Current address</dt><dd className="mt-1 text-sm text-gray-900">{[profile.current_address?.country, profile.current_address?.region, profile.current_address?.district, profile.current_address?.county, profile.current_address?.subcounty, profile.current_address?.parish, profile.current_address?.village].filter(v => v && v !== 'Not applicable').join(', ') || profile.address || 'Not provided'}</dd></div>
          </dl>
        </section> : <>
        <form onSubmit={save} className="space-y-8">
          <section className="space-y-4">
            <h2 className="border-b border-gray-300 pb-2 text-xl font-semibold">Basic information</h2>
            <label className="block text-sm font-semibold text-navy">Full name<input className="field mt-2" required maxLength={120} value={profile.full_name} onChange={e => change('full_name', e.target.value)} /></label>
            <label className="block text-sm font-semibold text-navy">Phone number<input className="field mt-2" type="tel" maxLength={40} value={profile.phone || ''} onChange={e => change('phone', e.target.value)} placeholder="+256..." /></label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-300 pb-2 text-xl font-semibold">Church information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Member status<input className="field mt-2" value={profile.member_status} readOnly /><span className="mt-1 block text-xs font-normal text-gray-500">Church administrators manage this status.</span></label>
              <label className="block text-sm font-semibold text-navy">Join date<input className="field mt-2" value={profile.join_date || 'Not yet recorded'} readOnly /><span className="mt-1 block text-xs font-normal text-gray-500">Church administrators manage this date.</span></label>
              <label className="block text-sm font-semibold text-navy">Small group<input className="field mt-2" maxLength={120} value={profile.small_group || ''} onChange={e => change('small_group', e.target.value)} /></label>
              <label className="block text-sm font-semibold text-navy">Ministry<input className="field mt-2" maxLength={120} value={profile.ministry || ''} onChange={e => change('ministry', e.target.value)} /></label>
            </div>
            <label className="block text-sm font-semibold text-navy">Areas you serve in <span className="font-normal text-gray-500">(separate multiple areas with commas)</span><input className="field mt-2" value={profile.areas_served.join(', ')} onChange={e => change('areas_served', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} placeholder="Worship, Ushering, Outreach..." /></label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-300 pb-2 text-xl font-semibold">Preferences</h2>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={profile.newsletter_opt_in} onChange={e => change('newsletter_opt_in', e.target.checked)} /> I would like to receive the church newsletter.</label>
            <label className="block text-sm font-semibold text-navy">Prayer-request visibility<select className="field mt-2" value={profile.prayer_request_visibility} onChange={e => change('prayer_request_visibility', e.target.value)}><option value="private">Only me</option><option value="leaders">Church leaders</option><option value="church">Church community</option></select></label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={profile.directory_opt_in} onChange={e => change('directory_opt_in', e.target.checked)} /> Include my basic details in the member directory (optional).</label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-300 pb-2 text-xl font-semibold">Optional personal details</h2>
            <p className="text-sm text-gray-600">These details are optional. Birthday stores only the day and month, not the year.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Birthday month<select className="field mt-2" value={profile.birthday_month} onChange={e => change('birthday_month', e.target.value)}><option value="">Not shared</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label>
              <label className="block text-sm font-semibold text-navy">Birthday day<select className="field mt-2" value={profile.birthday_day} onChange={e => change('birthday_day', e.target.value)}><option value="">Not shared</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            </div>
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-2 text-lg font-semibold text-navy">Place of Origin</h3>
                <p className="mb-4 text-sm font-normal text-gray-600">Where you come from or your home area.</p>
                <LocationPicker allowInternational value={profile.place_of_origin || {}} onChange={value => change('place_of_origin', value)} />
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-2 text-lg font-semibold text-navy">Current Address</h3>
                <p className="mb-4 text-sm font-normal text-gray-600">Where you currently live.</p>
                <LocationPicker allowInternational value={profile.current_address || {}} onChange={value => change('current_address', value)} />
                <label className="mt-4 block text-sm font-semibold text-navy">Additional address details (optional)
                  <input className="field mt-2" maxLength={300} value={profile.address || ''} onChange={e => change('address', e.target.value)} placeholder="House, plot, street, landmark..." />
                </label>
              </div>
            </div>
          </section>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button className="btn-custom w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Member Profile'}</button>
        </form>
        </>}
        <section className="mt-8 border-t border-gray-300 pt-6">
          <h2 className="mb-2 text-xl font-semibold">Audio and video call tests</h2>
          <p className="mb-4 text-sm text-gray-600">Create a private test room and check your microphone, camera (video test only), speaker, internet connection and two-device calling. Open the host link on this device and the guest link on another device.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => createVideoTestRoom('audio')} disabled={testRoomBusy} className="btn-custom disabled:opacity-50">
              {testRoomBusy ? 'Creating secure test room…' : 'Test audio call'}
            </button>
            <button type="button" onClick={() => createVideoTestRoom('video')} disabled={testRoomBusy} className="btn-custom disabled:opacity-50">
              {testRoomBusy ? 'Creating secure test room…' : 'Test video call'}
            </button>
          </div>
          {videoTestError && <p role="alert" className="mt-3 text-sm text-red-600">{videoTestError}</p>}
          {testRoom && <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-navy">{testRoom.call_mode === 'audio' ? 'Audio' : 'Video'} test room saved</p>
            <p className="mt-1 text-xs text-gray-500">Room: {testRoom.room_code}</p>
            <a href={testRoom.hostLink} className="mt-3 inline-block rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Open pastor / host call</a>
            <div className="mt-3 break-all text-xs text-gray-600">Guest link: {testRoom.guestLink}</div>
            <button type="button" onClick={() => navigator.clipboard?.writeText(testRoom.guestLink)} className="mt-2 text-sm font-semibold text-[#009cff]">Copy guest link</button>
            <p className="mt-2 text-xs text-gray-500">Keep the guest link private and use it only on your second device. The invitation keys are shown once for security.</p>
          </div>}
        </section>

        <section className="mt-8 border-t border-gray-300 pt-6">
          <h2 className="mb-2 text-xl font-semibold">Send a message to Tidori</h2>
          <p className="mb-4 text-sm text-gray-600">Send a question or request directly to the church administration team. Your account name and email will be attached automatically.</p>
          <form onSubmit={sendMemberMessage} className="space-y-4">
            <label className="block text-sm font-semibold text-navy">Subject
              <input className="field mt-2" maxLength={200} value={contactSubject} onChange={e => setContactSubject(e.target.value)} placeholder="What is your message about?" />
            </label>
            <label className="block text-sm font-semibold text-navy">Your message
              <textarea className="field mt-2" rows="5" maxLength={4000} required value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Write your message here..." />
            </label>
            {messageError && <p role="alert" className="text-sm text-red-600">{messageError}</p>}
            {messageSent && <p role="status" className="text-sm text-green-700">{messageSent}</p>}
            <button type="submit" className="btn-custom" disabled={sendingMessage || !contactMessage.trim()}>{sendingMessage ? 'Sending message...' : 'Send Message'}</button>
          </form>
        </section>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300 pt-5">
          <Link to="/" className="text-sm text-navy underline">Back to website</Link>
          <button onClick={logout} className="text-sm font-semibold text-red-700 underline">Sign out</button>
        </div>
        </>}
      </div>
    </section>
  </>;
}
