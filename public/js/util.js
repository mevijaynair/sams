// util.js — shared helpers.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isEidExpired(dateStr) {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return !Number.isNaN(t) && t < Date.now();
}
