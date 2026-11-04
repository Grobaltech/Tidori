import { useEffect, useState } from 'react';
import { useInView } from '../hooks/hooks';

export default function Counter({ value, label, icon }) {
  const [ref, seen] = useInView();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const end = Number(value) || 0;
    const step = Math.max(1, Math.floor(end / 40));
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(end, cur + step);
      setN(cur);
      if (cur >= end) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [seen, value]);
  return (
    <div ref={ref} className="text-center">
      {icon && <i className={`${icon} mb-3 block text-4xl text-gold`} />}
      <div className="text-4xl font-bold text-navy">{n}+</div>
      <div className="mt-1 text-sm uppercase tracking-wide">{label}</div>
    </div>
  );
}
