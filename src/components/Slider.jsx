import { useEffect, useState } from 'react';
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import { useItemsPerView } from '../hooks/hooks';

// Simple autoplay carousel: shows N items per view and loops.
export default function Slider({ items, render, autoplay = 4500 }) {
  const per = useItemsPerView();
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const visible = Math.min(per, count);
  const go = (d) => setStart((s) => (s + d + count) % count);

  useEffect(() => {
    if (paused || count <= visible) return;
    const t = setInterval(() => setStart((s) => (s + 1) % count), autoplay);
    return () => clearInterval(t);
  }, [paused, count, visible, autoplay]);

  const shown = Array.from({ length: visible }, (_, k) => items[(start + k) % count]);
  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${visible}, minmax(0, 1fr))` }}>
        {shown.map((it, k) => <div key={`${it.id}-${k}`} className="fade-in">{render(it)}</div>)}
      </div>
      {count > visible && (
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => go(-1)} aria-label="Previous" className="btn-custom !px-4"><FaAngleLeft /></button>
          <button onClick={() => go(1)} aria-label="Next" className="btn-custom !px-4"><FaAngleRight /></button>
        </div>
      )}
    </div>
  );
}
