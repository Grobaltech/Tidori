import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseReady, supabaseConfigError } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

export default function Login() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(location.pathname === '/register' || params.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileChoices, setProfileChoices] = useState([]);
  const [welcomeName, setWelcomeName] = useState('');

  const chooseProfile = (profile) => {
    const requestedNext = params.get('next');
    if (requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')) { navigate(requestedNext, { replace: true }); return; }
    if (profile === 'super_admin' || profile === 'admin' || profile === 'church_admin') navigate('/admin', { replace: true });
    else navigate('/profile', { replace: true });
  };

  useEffect(() => {
    setMode(location.pathname === '/register' || params.get('mode') === 'signup' ? 'signup' : 'login');
    setError('');
    setMessage('');
  }, [location.pathname, params]);

  const submit = async (e) => {
    e.preventDefault();
    if (!supabaseReady || !supabase) { setError(supabaseConfigError || 'Supabase account services are unavailable.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/profile`,
          },
        });
        if (authError) throw authError;
        if (data.session) navigate('/profile');
        else setMessage('Your account has been created. Check your email for a confirmation link, then sign in.');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;

        // Route by the role stored on this user's existing Tidori profile.
        // The member profile remains the destination for ordinary members.
        const { data: accountProfile, error: roleError } = await supabase
          .from('profiles')
          .select('role,member_status,full_name')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (roleError) {
          throw new Error(`You are signed in, but we could not verify your account permissions: ${roleError.message}`);
        }

        if (!accountProfile?.role) {
          throw new Error('Your account profile is missing its assigned role. Please contact a Tidori administrator; the system will not assume you are a member.');
        }

        const accountRole = String(accountProfile.role).trim().toLowerCase();
        if (!['member', 'leader', 'admin', 'super_admin'].includes(accountRole)) {
          throw new Error('Your account has an unrecognised role. Please contact a Tidori administrator.');
        }

        const memberStatus = String(accountProfile.member_status || '').trim().toLowerCase();
        const choices = [];
        if (['super_admin', 'admin'].includes(accountRole)) choices.push(accountRole);
        if (['leader', 'member'].includes(memberStatus) && !choices.includes(memberStatus)) choices.push(memberStatus);
        if (['leader', 'member'].includes(accountRole) && !choices.includes(accountRole)) choices.push(accountRole);

        let hasPortalAccess = ['admin', 'super_admin'].includes(accountRole);
        if (!hasPortalAccess) {
          const { data: grants, error: grantsError } = await supabase.from('user_permissions').select('permission').eq('user_id', authData.user.id).limit(1);
          hasPortalAccess = !grantsError && Boolean(grants?.length);
        }
        if (hasPortalAccess && !['admin', 'super_admin'].includes(accountRole) && !choices.includes('church_admin')) choices.push('church_admin');

        setWelcomeName(accountProfile.full_name || authData.user.email || 'there');
        if (choices.length > 1) {
          setProfileChoices(choices);
        } else if (choices.length === 1) {
          chooseProfile(choices[0]);
        } else {
          const requestedNext = params.get('next');
          navigate(requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/profile', { replace: true });
        }
      }
    } catch (err) {
      console.error('Tidori authentication failed:', err);
      setError([err.message, err.code ? `Code: ${err.code}` : '', err.status ? `Status: ${err.status}` : ''].filter(Boolean).join(' — ') || 'Unable to continue. Please try again.');
    }
    finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (!supabaseReady || !supabase) { setError(supabaseConfigError || 'Login is not connected to the Tidori database.'); return; }
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/profile` });
      if (resetError) throw resetError;
      setMessage('Password reset instructions have been sent to your email, if an account exists.');
    } catch (err) {
      console.error('Tidori password reset failed:', err);
      setError([err.message, err.code ? `Code: ${err.code}` : '', err.status ? `Status: ${err.status}` : ''].filter(Boolean).join(' — ') || 'Could not send reset email. Please try again.');
    }
    finally { setBusy(false); }
  };

  return <>
    <PageHeader title={mode === 'signup' ? 'Create Account' : 'Member Login'} />
    <section className="container-page max-w-xl py-16">
      <div className="bg-mist p-6 sm:p-10">
        {profileChoices.length > 1 ? <>
          <p className="mb-2 text-center text-gold">Welcome to Tidori Ministries</p>
          <h1 className="mb-3 text-center text-3xl">Welcome, {welcomeName}</h1>
          <p className="mb-7 text-center text-sm text-gray-600">Your account has more than one profile. Which one would you like to use for this session?</p>
          <div className="space-y-3">
            {profileChoices.map(profile => {
              const labels = { super_admin: 'Super Administrator', admin: 'Tidori Administrator', leader: 'Church Leader', member: 'Church Member', church_admin: 'Church Administration Portal' };
              const descriptions = { super_admin: 'Manage the entire Tidori Ministries platform and its administration.', admin: 'Manage the church administration portal.', leader: 'Continue to your church leader and member profile.', member: 'Continue to your church member profile.', church_admin: 'Open the administration portal using your granted permissions.' };
              return <button key={profile} type="button" onClick={() => chooseProfile(profile)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-[#009cff] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#009cff]">
                <span className="block font-semibold text-[#191c24]">{labels[profile]}</span>
                <span className="mt-1 block text-sm text-gray-500">{descriptions[profile]}</span>
                <span className="mt-3 block text-sm font-semibold text-[#009cff]">Continue with this profile →</span>
              </button>;
            })}
          </div>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); setProfileChoices([]); }} className="mt-6 w-full text-sm text-gray-500 underline">Not you? Sign out</button>
        </> : <>

        <p className="mb-2 text-center text-gold">{mode === 'signup' ? 'Join the Tidori community' : 'Welcome back'}</p>
        <h1 className="mb-8 text-center text-3xl">{mode === 'signup' ? 'Create your account' : 'Sign in to your account'}</h1>
        {!supabaseReady && <p role="alert" className="mb-5 bg-yellow-100 p-3 text-sm text-yellow-900">{supabaseConfigError}</p>}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && <input className="field" required maxLength={120} autoComplete="name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />}
          <input className="field" type="email" required autoComplete="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          <div className="relative">
            <input
              className="field pr-12"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Password (at least 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-2 text-gray-600 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {showPassword ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3" />
                  <path d="M6.2 6.2C3.9 7.6 2.7 9.7 2.5 12c.5 1.2 3.8 7 9.5 7 1.1 0 2.1-.2 3-.6" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button type="submit" className="btn-custom w-full" disabled={busy || !supabaseReady}>{busy ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'signup' ? 'Create Account' : 'Sign In'}</button>
        </form>
        {mode === 'login' && <button type="button" onClick={resetPassword} disabled={busy || !supabaseReady} aria-busy={busy} className="mt-4 text-sm text-navy underline">{busy ? 'Please wait...' : 'Forgot your password?'}</button>}
        <div className="mt-6 border-t border-gray-300 pt-5 text-center text-sm">
          {mode === 'login' ? <>Don't have an account? <Link className="font-semibold text-navy underline" to="/register">Register here</Link></> : <>Already registered? <Link className="font-semibold text-navy underline" to="/login">Sign in</Link></>}
        </div>
        </>}
      </div>
    </section>
  </>;
}
