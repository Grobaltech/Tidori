import React, { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return undefined;
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setShowHelp(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) {
      setShowHelp(true);
      return;
    }

    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch (error) {
      console.warn('Tidori installation prompt was not available:', error);
      setShowHelp(true);
    } finally {
      setInstallEvent(null);
    }
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={install}
        aria-label="Install Tidori Ministries"
        style={{
          position: 'fixed', right: 16, bottom: 18, zIndex: 9998,
          border: 0, borderRadius: 999, padding: '12px 18px',
          background: '#20212b', color: '#fff', fontWeight: 700,
          boxShadow: '0 5px 22px rgba(0,0,0,.24)', cursor: 'pointer'
        }}
      >
        <span aria-hidden="true" style={{ marginRight: 8 }}>⬇</span>
        Install Tidori
      </button>

      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tidori-install-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,.58)', display: 'grid',
            placeItems: 'center', padding: 20
          }}
        >
          <div style={{
            width: '100%', maxWidth: 420, background: '#fff',
            color: '#20212b', borderRadius: 16, padding: 24,
            boxShadow: '0 12px 40px rgba(0,0,0,.28)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <img src="/favicon.svg" alt="" width="48" height="48" style={{ borderRadius: 10 }} />
              <h2 id="tidori-install-title" style={{ margin: 0, fontSize: 21 }}>Install Tidori Ministries</h2>
            </div>
            <p style={{ margin: '0 0 12px' }}>
              Your browser has not made its automatic install prompt available yet. You can still add Tidori to your device:
            </p>
            <ul style={{ paddingLeft: 22, margin: '0 0 18px' }}>
              <li><strong>Android – Chrome:</strong> Open the three-dot menu and choose “Install app” or “Add to Home screen”.</li>
              <li><strong>iPhone/iPad – Safari:</strong> Tap Share, then “Add to Home Screen”.</li>
              <li><strong>Desktop – Chrome or Edge:</strong> Use the install icon in the address bar, or choose “Install Tidori” from the browser menu.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              style={{
                width: '100%', border: 0, borderRadius: 9, padding: 12,
                background: '#20212b', color: '#fff', fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
