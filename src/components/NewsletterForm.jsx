import { useState } from 'react';
import { subscribe } from '../lib/api';
import { useSubmit } from '../hooks/hooks';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, submit] = useSubmit(async () => {
    await subscribe(email);
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit({}, () => setEmail(''));
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="border border-white/20 bg-transparent px-3 py-2 text-white placeholder:text-white/50"
      />
      <button type="submit" disabled={state.status === 'sending'} className="btn-custom btn-gold !py-2">
        {state.status === 'sending' ? 'Sending...' : state.status === 'done' ? 'Subscribed!' : 'Subscribe'}
      </button>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
