import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API = 'https://tidori-ministries.grobaltechtechnologies.workers.dev';

export default function MobileAppBridge() {
  const navigate = useNavigate();
  const tokenRef = useRef('');
  const sessionRef = useRef(null);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let alive = true;
    let startY = 0;
    let startX = 0;
    let refreshing = false;
    const storeToken = async (token, session) => {
      if (!token || !session?.access_token) return;
      await fetch(`${API}/api/push/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
      }).catch(error => console.warn('Tidori push registration failed:', error));
    };
    const registerPush = async (session) => {
      if (!session?.access_token || !alive) return;
      sessionRef.current = session;
      try {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'prompt') permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') return;
        await PushNotifications.createChannel({ id: 'tidori_alerts', name: 'Tidori alerts', description: 'Verified Tidori payments, registrations and appointments', importance: 5, visibility: 1, sound: 'default', vibration: true });
        await PushNotifications.register();
        if (tokenRef.current) await storeToken(tokenRef.current, session);
      } catch (error) {
        console.warn('Tidori push notifications are not configured yet:', error);
      }
    };

    const registration = PushNotifications.addListener('registration', async token => {
      tokenRef.current = token.value;
      await storeToken(token.value, sessionRef.current);
    });
    const registrationError = PushNotifications.addListener('registrationError', error => console.warn('Push registration error:', error));
    const received = PushNotifications.addListener('pushNotificationReceived', () => {});
    const action = PushNotifications.addListener('pushNotificationActionPerformed', event => {
      const path = event.notification?.data?.path;
      if (typeof path === 'string' && path.startsWith('/')) navigate(path);
    });
    const auth = supabase?.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
      if (session) registerPush(session);
    });
    supabase?.auth.getSession().then(({ data }) => { if (data.session) registerPush(data.session); });

    const onTouchStart = event => {
      if (window.scrollY > 2 || event.touches.length !== 1) { startY = 0; return; }
      startY = event.touches[0].clientY;
      startX = event.touches[0].clientX;
    };
    const onTouchMove = event => {
      if (!startY || refreshing || window.scrollY > 2 || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - startY;
      const dx = Math.abs(event.touches[0].clientX - startX);
      if (dy > 0 && dx < 45) setPulling(dy > 28);
    };
    const onTouchEnd = event => {
      if (!startY) return;
      const dy = event.changedTouches?.[0]?.clientY - startY;
      startY = 0;
      setPulling(false);
      if (dy >= 105 && window.scrollY <= 2 && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      alive = false;
      registration.then(handle => handle.remove());
      registrationError.then(handle => handle.remove());
      received.then(handle => handle.remove());
      action.then(handle => handle.remove());
      auth?.data?.subscription?.unsubscribe();
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);

  if (!Capacitor.isNativePlatform() || !pulling) return null;
  return <div className="fixed left-0 right-0 top-0 z-[100] flex justify-center bg-ink/90 py-2 text-xs font-semibold text-white">Release to refresh Tidori</div>;
}
