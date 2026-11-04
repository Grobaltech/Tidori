import { useState } from 'react';
import { sendContact } from '../lib/api';
import { useSubmit } from '../hooks/hooks';

const empty = { name: '', email: '', subject: '', message: '', trap: '' };

export default function ContactForm() {
  const [v, setV] = useState(empty);
  const [state, submit] = useSubmit(sendContact);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const onSubmit = (e) => {
    e.preventDefault();
    if (v.trap) return;
    const { trap, ...row } = v;
    submit(row, () => setV(empty));
  };
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <input className="field" placeholder="Your Name" required value={v.name} onChange={set('name')} />
        <input className="field" type="email" placeholder="Your Email" required value={v.email} onChange={set('email')} />
      </div>
      <input className="field mb-4" placeholder="Subject" value={v.subject} onChange={set('subject')} />
      <textarea className="field mb-4" rows="6" placeholder="Message" required value={v.message} onChange={set('message')} />
      <input className="hidden" tabIndex={-1} autoComplete="off" value={v.trap} onChange={set('trap')} aria-hidden="true" />
      <button className="btn-custom" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
      {state.status === 'done' && <p className="mt-3 text-navy">Thank you! Your message has been sent.</p>}
      {state.status === 'error' && <p className="mt-3 text-red-500">{state.error}</p>}
    </form>
  );
}
