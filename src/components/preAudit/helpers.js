import { useEffect, useState } from 'react';

export const int = (v) => (v ?? 0).toLocaleString();
export const money = (v) => (v == null ? '-' : v.toLocaleString(undefined, { maximumFractionDigits: 0 }));
export const parseJson = (raw) => (typeof raw === 'string' ? JSON.parse(raw) : raw) || null;

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const cardStyles = (theme) => ({
  card: { padding: 20, height: '100%' },
  cardLabel: { color: theme.palette.primary.main },
  band: { ...theme.table.title, padding: theme.spacing(1, 2), marginTop: theme.spacing(3) },
  filters: { margin: theme.spacing(2, 0), alignItems: 'center' },
  note: { color: theme.palette.text.secondary, display: 'block', marginTop: theme.spacing(1) },
  link: {
    padding: 0, minWidth: 0, textTransform: 'none', fontWeight: 500,
  },
});
