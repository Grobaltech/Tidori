import { useState } from 'react';

const presets = [10, 20, 50, 100];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GiveForm({ projectId = null, dark = false }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(20);
  const [custom, setCustom] = useState('');
  const [phone, setPhone] = useState('');
  const [trap, setTrap] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
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
      window.location.assign(data.redirect_url);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Unable to start payment. Please try again.');
    }
  };

  return (
    <form onSubmit={onSubmit} className={dark ? 'bg-ink/80 p-8' : 'bg-mist p-8'}>
      <input className={`${cls} mb-4`} placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <input className={`${cls} mb-4`} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={`${cls} mb-4`} type="tel" placeholder="Phone (optional, include country code)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button type="button" key={p} onClick={() => { setAmount(p); setCustom(''); }}
            className={`btn-custom !px-4 ${dark ? 'btn-light' : ''} ${!custom && amount === p ? 'is-active' : ''}`}>
            ${p}
          </button>
        ))}
      </div>
      <input className={`${cls} mb-4`} type="number" min="1" step="0.01" placeholder="Other amount (USD)" value={custom} onChange={(e) => setCustom(e.target.value)} />
      <input className="hidden" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
      <button className={`btn-custom ${dark ? 'btn-light' : ''}`} disabled={status === 'sending'}>
        {status === 'sending' ? 'Connecting to Pesapal...' : 'Continue to Secure Payment'}
      </button>
      {status === 'error' && <p className="mt-3 text-red-500">{error}</p>}
      <p className={`mt-3 text-sm ${dark ? 'text-white/80' : 'text-ink/70'}`}>You will complete your donation securely on Pesapal.</p>
    </form>
  );
}
