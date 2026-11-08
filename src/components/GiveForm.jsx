import { useState } from 'react';

const presets = [10000, 20000, 50000, 100000];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GiveForm({ projectId = null, dark = false }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(20000);
  const [custom, setCustom] = useState('');
  const [phone, setPhone] = useState('');
  const [trap, setTrap] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [reference, setReference] = useState('');
  const final = custom ? Number(custom) : amount;
  const cls = dark ? 'field-dark' : 'field';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (trap || !(final > 0)) return;
    setStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/payments/pesapal/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, amount: final,
          project_id: projectId && UUID.test(projectId) ? projectId : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.redirect_url) throw new Error(data.error || 'Unable to start payment. Please try again.');
      setCheckoutUrl(data.redirect_url);
      setReference(data.reference || '');
      setStatus('checkout');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Unable to start payment. Please try again.');
    }
  };

  if (checkoutUrl) {
    return (
      <section className={dark ? 'bg-ink/80 p-4 sm:p-6' : 'bg-mist p-4 sm:p-6'} aria-label="Secure Pesapal checkout">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={dark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-ink'}>Complete your donation</h3>
            <p className={dark ? 'text-sm text-white/75' : 'text-sm text-ink/70'}>Secure payment powered by Pesapal. You are still on Tidori Ministries.</p>
          </div>
          <button type="button" onClick={() => { setCheckoutUrl(''); setStatus('idle'); }}
            className={`btn-custom !px-4 ${dark ? 'btn-light' : ''}`}>
            Back
          </button>
        </div>
        <iframe
          title="Pesapal secure payment"
          src={checkoutUrl}
          className="block w-full rounded-lg bg-white"
          style={{ height: 'min(780px, 78vh)', minHeight: '560px', border: 0 }}
          allow="payment *"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <p className={dark ? 'mt-3 text-xs text-white/70' : 'mt-3 text-xs text-ink/65'}>
          If the payment window does not load, <a className="underline" href={checkoutUrl} target="_blank" rel="noopener noreferrer">open secure checkout in a new tab</a>.
          {reference ? ` Reference: ${reference}` : ''}
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className={dark ? 'bg-ink/80 p-8' : 'bg-mist p-8'}>
      <input className={`${cls} mb-4`} placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <input className={`${cls} mb-4`} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={`${cls} mb-4`} type="tel" placeholder="Phone (optional, include country code)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button type="button" key={p} aria-pressed={!custom && amount === p}
            onClick={() => { setAmount(p); setCustom(''); }}
            className={`btn-custom !px-4 !border-2 !border-[#d99b16] !font-semibold !transition-colors !duration-200 ${!custom && amount === p ? '!bg-[#fdbe33] !text-[#17202a] shadow-md' : '!bg-[#fff1c9] !text-[#49370d] hover:!bg-[#fdbe33]'}`}>
            UGX {p.toLocaleString('en-UG')}
          </button>
        ))}
      </div>
      <input className={`${cls} mb-4`} type="number" min="1" step="1" placeholder="Other amount (UGX)" value={custom} onChange={(e) => setCustom(e.target.value)} />
      <input className="hidden" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
      <button className={`btn-custom ${dark ? 'btn-light' : ''}`} disabled={status === 'sending'}>
        {status === 'sending' ? 'Connecting to Pesapal...' : 'Continue to Secure Payment'}
      </button>
      {status === 'error' && <p className="mt-3 text-red-500">{error}</p>}
      <p className={`mt-3 text-sm ${dark ? 'text-white/80' : 'text-ink/70'}`}>Your payment options will appear securely here, without leaving Tidori Ministries.</p>
    </form>
  );
}
