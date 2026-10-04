// Local-time date helpers. Dates are stored as 'YYYY-MM-DD' strings.
export const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
export const yearOf = (s) => Number(String(s).slice(0, 4));

const fmt = (s, opts) => parseDate(s).toLocaleDateString(undefined, opts);
export const fmtLong = (s) => fmt(s, { weekday: 'long', month: 'long', day: 'numeric' });
export const fmtDay = (s) => fmt(s, { weekday: 'short', month: 'short', day: 'numeric' });
export const fmtShort = (s) => fmt(s, { month: 'short', day: 'numeric' });
export const fmtFull = (s) => fmt(s, { month: 'short', day: 'numeric', year: 'numeric' });

export function relativeDay(s, today = todayStr()) {
  const diff = daysBetween(s, today);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff} days ago`;
  return fmtShort(s);
}
