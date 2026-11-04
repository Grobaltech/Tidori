import { useState } from 'react';
import { sendPledge } from '../lib/api';
import { useSubmit } from '../hooks/hooks';
import { site } from '../config/site';

const presets = [10, 20, 50, 100];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GiveForm({ projectId = null, dark = false }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(20);
  const [custom, setCustom] = useState('');
  const [trap, setTrap] = useState(''); // honeypot
  const [state, submit] = useSubmit(sendPledge);
  const final = custom ? Number(custom) : amount;
  const cls = dark ? 'field-dark' : 'field';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (trap || !(final > 0)) return;
    await submit(
      { name, email, amount: final, project_id: projectId && UUID.test(projectId) ? projectId : null },
      () => { setName(''); setEmail(''); setCustom(''); }
    );
    if (site.giveUrl) window.open(site.giveUrl, '_blank', 'noopener');
  };

  return (
    <form onSubmit={onSubmit} className={dark ? 'bg-ink/80 p-8' : 'bg-mist p-8'}>
      <input className={`${cls} mb-4`} placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <input className={`${cls} mb-4`} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button type="button" key={p} onClick={() => { setAmount(p); setCustom(''); }}
            className={`btn-custom !px-4 ${dark ? 'btn-light' : ''} ${!custom && amount === p ? 'is-active' : ''}`}>
            ${p}
          </button>
        ))}
      </div>
      <input className={`${cls} mb-4`} type="number" min="1" step="1" placeholder="Other amount (USD)" value={custom} onChange={(e) => setCustom(e.target.value)} />
      <input className="hidden" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
      <button className={`btn-custom ${dark ? 'btn-light' : ''}`} disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Sending...' : 'Give Now'}
      </button>
      {state.status === 'done' && (
        <p className={`mt-3 ${dark ? 'text-white' : 'text-navy'}`}>
          Thank you! Your gift of ${final} has been noted.{site.giveUrl ? ' Please complete payment in the window that opened.' : ''}
        </p>
      )}
      {state.status === 'error' && <p className="mt-3 text-red-500">{state.error}</p>}
    </form>
  );
}
