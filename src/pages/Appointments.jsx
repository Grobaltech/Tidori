import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useDocTitle } from '../hooks/hooks';
import { supabase, supabaseReady } from '../lib/supabase';

const currencyText = currency => currency === 'USD' ? '🇺🇸 USD · US Dollar' : '🇺🇬 UGX · Ugandan Shilling';
const formatMoney = (amount, currency = 'UGX') => new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-UG', { style: 'currency', currency, maximumFractionDigits: currency === 'UGX' ? 0 : 2 }).format(Number(amount) || 0);

export default function Appointments() {
  useDocTitle('Appointments');
  const [params] = useSearchParams();
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');

  useEffect(() => {
    let active = true;
    const load = async session => {
      if (!active) return;
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (!currentUser) { setRows([]); setLoading(false); return; }
      setLoading(true);
      const { data, error: queryError } = await supabase.from('appointments')
        .select('id,appointment_type,meeting_mode,requested_at,status,payment_status,fee_amount,currency,package_tier,created_at')
        .eq('user_id', currentUser.id).order('created_at', { ascending: false });
      if (!active) return;
      if (queryError) setError(queryError.message);
      else setRows(data || []);
      setLoading(false);
    };
    if (!supabaseReady || !supabase) {
      setError('Member account services are not available right now.');
      setLoading(false);
      return () => { active = false; };
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => load(session));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const reference = params.get('reference');
    const status = params.get('payment');
    if (!reference || !status) return;
    let active = true;
    fetch('/api/payments/status?reference=' + encodeURIComponent(reference), { cache: 'no-store' })
      .then(response => response.json())
      .then(data => {
        if (!active) return;
        const value = data.payment_status || data.status || status;
        setPaymentNotice(value === 'paid'
          ? 'Payment verified successfully. Your appointment request has been received and is awaiting confirmation by the church team.'
          : value === 'cancelled'
            ? 'Checkout was cancelled. Your appointment request remains unpaid; contact the church office if you still wish to proceed.'
            : 'Your payment is being verified. Please wait a moment; the appointment will update automatically when Pesapal confirms it.');
      })
      .catch(() => { if (active) setPaymentNotice('Your appointment request has been received. Payment verification may still be processing.'); });
    return () => { active = false; };
  }, [params]);

  const statusClass = status => ({ requested: 'bg-amber-100 text-amber-800', confirmed: 'bg-emerald-100 text-emerald-800', completed: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-200 text-gray-700' }[status] || 'bg-gray-100 text-gray-700');

  return <>
    <PageHeader title="Appointments" />
    <section className="container-page py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 font-semibold uppercase tracking-wider text-gold">Pastoral care</p><h1 className="text-3xl sm:text-4xl">Your appointments</h1><p className="mt-2 max-w-2xl text-gray-600">View your appointment requests, meeting details, payment status and ministry updates in one place.</p></div>
          <Link to="/appointments/book" className="btn-custom">Book an Appointment</Link>
        </div>
        {paymentNotice && <p role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{paymentNotice}</p>}
        {!user ? <div className="rounded-2xl border border-gray-200 bg-mist p-6 sm:p-9">
          <h2 className="text-2xl font-semibold text-ink">Sign in to view your appointment history</h2>
          <p className="mt-2 max-w-2xl leading-7 text-gray-600">Your appointment history is private and linked to your Tidori member account. Please sign in to see previous requests, confirmations and payment updates.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link to="/login?next=%2Fappointments" className="btn-custom">Sign In</Link><Link to="/register?next=%2Fappointments" className="rounded-lg border border-ink px-5 py-3 font-semibold text-ink transition hover:bg-ink hover:text-white">Create Account</Link></div>
        </div> : loading ? <p className="rounded-xl bg-mist p-6 text-gray-600">Loading your appointment history…</p> : error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{error}</p> : rows.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-mist p-7 text-center"><h2 className="text-xl font-semibold text-ink">No appointments yet</h2><p className="mt-2 text-gray-600">When you request an appointment while signed in, it will appear here.</p><Link to="/appointments/book" className="btn-custom mt-5 inline-flex">Book your first appointment</Link></div> : <div className="space-y-4">
          {rows.map(row => <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">{row.appointment_type || 'Pastoral appointment'}</h2><p className="mt-1 text-sm text-gray-500">{row.requested_at ? new Date(row.requested_at).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date to be confirmed'} · {(row.meeting_mode || 'in_person').replace('_', ' ')}</p></div><span className={'rounded-full px-3 py-1 text-xs font-bold capitalize ' + statusClass(row.status)}>{row.status || 'requested'}</span></div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-sm"><span><span className="text-gray-500">Payment:</span> <strong className="capitalize">{row.payment_status || 'unpaid'}</strong></span><span><span className="text-gray-500">Contribution:</span> <strong>{formatMoney(row.fee_amount, row.currency || 'UGX')}</strong></span>{row.package_tier && <span><span className="text-gray-500">Package:</span> <strong className="capitalize">{row.package_tier}</strong></span>}</div>
            <p className="mt-2 text-xs text-gray-400">{currencyText(row.currency || 'UGX')} · Requested {new Date(row.created_at).toLocaleDateString('en-UG', { dateStyle: 'medium' })}</p>
          </article>)}
        </div>}
      </div>
    </section>
  </>;
}
