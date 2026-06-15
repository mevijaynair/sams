// store.js — shared client state + pub/sub.
export const store = {
  token: localStorage.getItem('sams_token') || null,
  user: null,                 // { id, name, role, roleLabel, tenant_id, sport, permissions[] }
  tenantId: null,             // active tenant (super admin can switch; others fixed)
  students: [],
  _subs: [],

  subscribe(fn) { this._subs.push(fn); },
  notify() { this._subs.forEach(fn => fn()); },

  setStudents(list) { this.students = list; this.notify(); },
  getStudent(id) { return this.students.find(s => s.id === id); },

  setToken(t) { this.token = t; t ? localStorage.setItem('sams_token', t) : localStorage.removeItem('sams_token'); },
  can(perm) { return !!this.user && this.user.permissions.includes(perm); },
  isSuper() { return this.user && this.user.role === 'super_admin'; }
};

let toastTimer;
export function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}
