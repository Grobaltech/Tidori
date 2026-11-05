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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (roleError) {
          throw new Error(`You are signed in, but we could not verify your account permissions: ${roleError.message}`);
        }

        const accountRole = String(accountProfile?.role || 'member').trim().toLowerCase();
        navigate(['admin', 'super_admin'].includes(accountRole) ? '/admin' : '/profile', { replace: true });
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
        <p className="mb-2 text-center text-gold">{mode === 'signup' ? 'Join the Tidori community' : 'Welcome back'}</p>
        <h1 className="mb-8 text-center text-3xl">{mode === 'signup' ? 'Create your account' : 'Sign in to your account'}</h1>
        {!supabaseReady && <p role="alert" className="mb-5 bg-yellow-100 p-3 text-sm text-yellow-900">{supabaseConfigError}</p>}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && <input className="field" required maxLength={120} autoComplete="name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />}
          <input className="field" type="email" required autoComplete="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="field" type="password" required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Password (at least 6 characters)" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button type="submit" className="btn-custom w-full" disabled={busy || !supabaseReady}>{busy ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'signup' ? 'Create Account' : 'Sign In'}</button>
        </form>
        {mode === 'login' && <button type="button" onClick={resetPassword} disabled={busy || !supabaseReady} aria-busy={busy} className="mt-4 text-sm text-navy underline">{busy ? 'Please wait...' : 'Forgot your password?'}</button>}
        <div className="mt-6 border-t border-gray-300 pt-5 text-center text-sm">
          {mode === 'login' ? <>Don't have an account? <Link className="font-semibold text-navy underline" to="/register">Register here</Link></> : <>Already registered? <Link className="font-semibold text-navy underline" to="/login">Sign in</Link></>}
        </div>
      </div>
    </section>
  </>;
}
