import { useEffect, useRef, useState } from 'react';

// Load data with loading state
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.resolve()
      .then(() => fn())
      .then((d) => {
        if (live) setData(d);
      })
      .catch((error) => {
        console.error('Page data could not be loaded:', error);
        if (live) setData(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

// true once element scrolls into view (used for counters / progress bars)
export function useInView(options = { threshold: 0.3 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), options);
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);
  return [ref, seen];
}

export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const on = () => setY(window.scrollY);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return y;
}

export function useDocTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Tidori Ministries` : 'Tidori Ministries';
  }, [title]);
}

// number of slider items per screen
export function useItemsPerView() {
  const calc = () => (window.innerWidth >= 992 ? 3 : window.innerWidth >= 768 ? 2 : 1);
  const [n, setN] = useState(calc);
  useEffect(() => {
    const on = () => setN(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
}

// form submit state machine
export function useSubmit(action) {
  const [state, setState] = useState({ status: 'idle', error: '' });
  const submit = async (values, reset) => {
    setState({ status: 'sending', error: '' });
    try {
      await action(values);
      setState({ status: 'done', error: '' });
      reset?.();
    } catch (e) {
      setState({ status: 'error', error: e.message });
    }
  };
  return [state, submit];
}
