// store.js — tiny shared state + pub/sub so modules re-render on data changes.
export const store = {
  tenantId: null,
  students: [],     // cache of the current tenant's students
  _subs: [],

  subscribe(fn) { this._subs.push(fn); },
  notify() { this._subs.forEach(fn => fn()); },

  setStudents(list) { this.students = list; this.notify(); },
  getStudent(id) { return this.students.find(s => s.id === id); }
};

let toastTimer;
export function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}
