import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'tidori-cookie-consent-v1';

const defaultPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function readConsent() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveConsent(preferences) {
  const consent = {
    ...defaultPreferences,
    ...preferences,
    necessary: true,
    savedAt: new Date().toISOString(),
    version: 1,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // The consent controls remain usable for this visit if storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent('tidori-cookie-consent-updated', { detail: consent }));
  return consent;
}

export default function CookieConsent() {
  const [consent, setConsent] = useState(() => readConsent());
  const [visible, setVisible] = useState(() => !readConsent());
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(() => Boolean(readConsent()?.analytics));
  const [marketing, setMarketing] = useState(() => Boolean(readConsent()?.marketing));

  useEffect(() => {
    const sync = () => {
      const next = readConsent();
      setConsent(next);
      setAnalytics(Boolean(next?.analytics));
      setMarketing(Boolean(next?.marketing));
      setVisible(!next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const choose = (preferences) => {
    const next = saveConsent(preferences);
    setConsent(next);
    setVisible(false);
    setCustomizing(false);
  };

  return (
    <>
      {!visible && consent && (
        <button
          type="button"
          onClick={() => { setAnalytics(Boolean(consent.analytics)); setMarketing(Boolean(consent.marketing)); setCustomizing(true); setVisible(true); }}
          className="fixed bottom-4 left-4 z-[70] rounded-full border border-gold/60 bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-navy focus:outline-none focus:ring-2 focus:ring-gold"
          aria-label="Open cookie preferences"
        >
          Cookie settings
        </button>
      )}

      {visible && (
        <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-5" role="region" aria-label="Cookie consent">
          <div className="mx-auto max-w-5xl rounded-2xl border border-gold/40 bg-white shadow-[0_12px_50px_rgba(0,0,0,.25)]">
            <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">Tidori Ministries</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Your privacy matters</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
                  We use essential storage to keep this website working. With your permission, optional analytics and marketing technologies may also be used to understand site use and improve communications. You can change your choice at any time in Cookie settings.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Read our <Link to="/privacy-policy" className="font-semibold text-ink underline decoration-gold underline-offset-2" onClick={() => setVisible(false)}>Privacy Policy</Link>.
                </p>
              </div>

              {!customizing ? (
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <button type="button" onClick={() => choose({ necessary: true, analytics: true, marketing: true })} className="rounded-lg bg-gold px-5 py-3 text-sm font-bold text-ink transition hover:brightness-95">Accept all</button>
                  <button type="button" onClick={() => choose(defaultPreferences)} className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-ink transition hover:border-gold">Reject optional</button>
                  <button type="button" onClick={() => setCustomizing(true)} className="px-5 py-2 text-sm font-semibold text-ink underline underline-offset-4 hover:text-gold">Customize</button>
                </div>
              ) : (
                <div className="w-full min-w-0 md:w-72">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
                    <span className="text-sm font-bold text-ink">Cookie preferences</span>
                    <button type="button" onClick={() => setCustomizing(false)} className="text-xs font-semibold text-gray-500 underline">Back</button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-semibold text-ink">Essential</p><p className="text-xs text-gray-500">Required for core site features</p></div>
                      <span className="text-xs font-bold text-green-700">Always on</span>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                      <span><span className="block text-sm font-semibold text-ink">Analytics</span><span className="block text-xs text-gray-500">Helps us understand site usage</span></span>
                      <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} className="h-5 w-5 accent-[#c99b32]" />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                      <span><span className="block text-sm font-semibold text-ink">Marketing</span><span className="block text-xs text-gray-500">Supports relevant communications</span></span>
                      <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} className="h-5 w-5 accent-[#c99b32]" />
                    </label>
                  </div>
                  <button type="button" onClick={() => choose({ necessary: true, analytics, marketing })} className="mt-4 w-full rounded-lg bg-gold px-5 py-3 text-sm font-bold text-ink transition hover:brightness-95">Save my choices</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
