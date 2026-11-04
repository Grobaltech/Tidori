import { useState } from 'react';
import { sendVolunteer } from '../lib/api';
import { useSubmit } from '../hooks/hooks';

const areas = ['Worship & Music', 'Children & Youth', 'Outreach & Food Pantry', 'Hospitality', 'Media & Tech', 'Prayer Team', 'Other'];
const empty = { name: '', email: '', phone: '', area: areas[0], message: '', trap: '' };

export default function VolunteerForm() {
  const [v, setV] = useState(empty);
  const [state, submit] = useSubmit(sendVolunteer);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const onSubmit = (e) => {
    e.preventDefault();
    if (v.trap) return;
    const { trap, ...row } = v;
    submit(row, () => setV(empty));
  };
  return (
    <form onSubmit={onSubmit} className="bg-ink/80 p-8">
      <input className="field-dark mb-4" placeholder="Name" required value={v.name} onChange={set('name')} />
      <input className="field-dark mb-4" type="email" placeholder="Email" required value={v.email} onChange={set('email')} />
      <input className="field-dark mb-4" placeholder="Phone (optional)" value={v.phone} onChange={set('phone')} />
      <select className="field-dark mb-4 [&>option]:text-ink" value={v.area} onChange={set('area')}>
        {areas.map((a) => <option key={a}>{a}</option>)}
      </select>
      <textarea className="field-dark mb-4" rows="4" placeholder="Tell us about yourself" value={v.message} onChange={set('message')} />
      <input className="hidden" tabIndex={-1} autoComplete="off" value={v.trap} onChange={set('trap')} aria-hidden="true" />
      <button className="btn-custom btn-light" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Sending...' : 'Become a Volunteer'}
      </button>
      {state.status === 'done' && <p className="mt-3 text-white">Thank you! We will be in touch soon.</p>}
      {state.status === 'error' && <p className="mt-3 text-red-300">{state.error}</p>}
    </form>
  );
}
