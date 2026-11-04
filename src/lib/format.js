export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const dateLong = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const timeShort = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const pct = (raised, goal) => (goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0);

// aliases used by some components
export const formatCurrency = money;
export const formatDate = dateLong;
