import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseReady } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const emptyProfile = {
  full_name: '', phone: '', photo_url: '', member_status: 'visitor', join_date: '',
  small_group: '', ministry: '', areas_served: [], newsletter_opt_in: false,
  prayer_request_visibility: 'leaders', directory_opt_in: false,
  birthday_month: '', birthday_day: '', address: '',
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
        address: profile.address.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error: saveError } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (saveError) throw saveError;
      setMessage('Your member profile has been saved.');
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

  const logout = async () => { await supabase.auth.signOut(); navigate('/'); };

  if (busy) return <div className="container-page py-20 text-center">Loading your profile...</div>;
  if (!supabaseReady) return <div className="container-page py-20 text-center">Account services are not configured.</div>;
  if (!user) return null;

  return <>
    <PageHeader title="My Profile" />
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
            <label className="block text-sm font-semibold text-navy">Address<input className="field mt-2" maxLength={300} value={profile.address || ''} onChange={e => change('address', e.target.value)} /></label>
          </section>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button className="btn-custom w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Member Profile'}</button>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300 pt-5">
          <Link to="/" className="text-sm text-navy underline">Back to website</Link>
          <button onClick={logout} className="text-sm font-semibold text-red-700 underline">Sign out</button>
        </div>
        </>}
      </div>
    </section>
  </>;
}
