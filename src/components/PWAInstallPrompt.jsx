import React, { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checkingInstall, setCheckingInstall] = useState(true);

  useEffect(() => {
    let active = true;

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

    const detectInstalledApp = async () => {
      const isStandalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

      if (isStandalone) {
        if (active) setInstalled(true);
        if (active) setCheckingInstall(false);
        return;
      }

      // Chromium can report an installed web app even when this page is
      // currently open in a normal browser tab.
      if (typeof navigator.getInstalledRelatedApps === 'function') {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          const tidoriInstalled = relatedApps.some(
            (app) => app.platform === 'webapp'
          );
          if (active && tidoriInstalled) setInstalled(true);
        } catch (error) {
          console.info('Tidori installed-app status could not be checked:', error);
        }
      }

      if (active) setCheckingInstall(false);
    };

    detectInstalledApp();

    return () => {
      active = false;
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
      const choice = await installEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        setInstalled(true);
      }
    } catch (error) {
      console.warn('Tidori installation prompt was not available:', error);
      setShowHelp(true);
    } finally {
      setInstallEvent(null);
    }
  };

  if (checkingInstall || installed || dismissed) return null;

  return (
    <>
      <aside
        role="region"
        aria-label="Install Tidori Ministries"
        style={{
          position: 'fixed', top: 'max(10px, env(safe-area-inset-top))',
          left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)', maxWidth: 760, zIndex: 9998,
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '11px 13px', boxSizing: 'border-box',
          background: '#20212b', color: '#fff', borderRadius: 14,
          border: '1px solid rgba(255,255,255,.14)',
          boxShadow: '0 8px 28px rgba(15,18,30,.25)',
          fontFamily: 'inherit'
        }}
      >
        <img
          src="/favicon.svg"
          alt=""
          width="38"
          height="38"
          style={{ flex: '0 0 38px', borderRadius: 9, background: '#fff' }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 750, lineHeight: 1.25 }}>
            Get the Tidori app
          </div>
          <div style={{ fontSize: 12, opacity: .82, lineHeight: 1.35, marginTop: 3 }}>
            Install for quicker, easier access to Tidori Ministries.
          </div>
        </div>
        <button
          type="button"
          onClick={install}
          style={{
            flex: '0 0 auto', border: 0, borderRadius: 9,
            padding: '10px 14px', background: '#d9b66f',
            color: '#20212b', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install notification"
          style={{
            flex: '0 0 28px', width: 28, height: 28, padding: 0,
            border: 0, borderRadius: 7, background: 'transparent',
            color: '#fff', fontSize: 21, lineHeight: 1, cursor: 'pointer'
          }}
        >
          ×
        </button>
      </aside>

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
              Chrome has not offered Tidori its direct installation prompt on this visit. This can happen when Chrome has not yet recognised the site as installable. On Android Chrome, use the browser menu and choose “Add to Home screen” if available.
            </p>
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
