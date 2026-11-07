import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import { supabase, supabaseReady } from '../lib/supabase';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!supabaseReady || !supabase) return undefined;
    let userId = null;
    let channel = null;
    let alive = true;
    const refresh = async id => {
      if (!id) { setCount(0); return; }
      const { count: total, error } = await supabase.from('notifications')
        .select('id', { count: 'exact', head: true }).eq('user_id', id).is('read_at', null);
      if (alive && !error) setCount(total || 0);
    };
    const attach = id => {
      if (channel) supabase.removeChannel(channel);
      userId = id;
      refresh(id);
      if (id) channel = supabase.channel('tidori-notification-count-' + id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + id }, () => refresh(id))
        .subscribe();
    };
    supabase.auth.getSession().then(({ data }) => attach(data.session?.user?.id || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => attach(session?.user?.id || null));
    return () => { alive = false; listener.subscription.unsubscribe(); if (channel) supabase.removeChannel(channel); };
  }, []);
  return <Link to="/notifications" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} title="Notifications" className="relative p-2 text-xl text-white transition-colors hover:text-gold">
    <FaBell />
    {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white">{count > 99 ? '99+' : count}</span>}
  </Link>;
}
