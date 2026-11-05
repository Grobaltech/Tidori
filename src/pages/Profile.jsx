import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseReady } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseReady) { setBusy(false); return; }
    let active = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) { navigate('/login'); return; }
      setUser(data.user);
      setName(data.user.user_metadata?.full_name || '');
      setPhone(data.user.user_metadata?.phone || '');
      setBusy(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
      else if (active) setUser(session.user);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [navigate]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } });
      if (updateError) throw updateError;
      setUser(data.user); setMessage('Your profile has been updated.');
    } catch (err) { setError(err.message || 'Could not update your profile.'); }
    finally { setSaving(false); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (busy) return <div className="container-page py-20 text-center">Loading your profile...</div>;
  if (!supabaseReady) return <div className="container-page py-20 text-center">Account services are not configured.</div>;
  if (!user) return null;

  return <>
    <PageHeader title="My Profile" />
    <section className="container-page max-w-2xl py-16">
      <div className="bg-mist p-6 sm:p-10">
        <h1 className="mb-2 text-3xl">Your account</h1>
        <p className="mb-8 break-all text-sm text-gray-600">{user.email}</p>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm font-semibold text-navy">Full name<input className="field mt-2" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="block text-sm font-semibold text-navy">Phone number<input className="field mt-2" type="tel" maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256..." /></label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button className="btn-custom w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300 pt-5">
          <Link to="/" className="text-sm text-navy underline">Back to website</Link>
          <button onClick={logout} className="text-sm font-semibold text-red-700 underline">Sign out</button>
        </div>
      </div>
    </section>
  </>;
}
