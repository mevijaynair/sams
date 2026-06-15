// api.js — fetch wrapper. Adds the auth token and (for super admins) the active
// tenant header on every call.
import { store, toast } from './store.js';

async function req(method, path, body) {
  const headers = {};
  if (store.token) headers['Authorization'] = `Bearer ${store.token}`;
  if (store.isSuper() && store.tenantId) headers['X-Tenant-Id'] = store.tenantId;
  const opts = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  if (res.status === 401) { handleUnauthorized(); throw new Error('Session expired'); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function handleUnauthorized() {
  store.setToken(null); store.user = null;
  toast('Session expired — please sign in again', true);
  window.dispatchEvent(new CustomEvent('sams:logout'));
}

export const api = {
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  logout: () => req('POST', '/auth/logout'),
  me: () => req('GET', '/auth/me'),

  tenants: () => req('GET', '/tenants'),
  createTenant: (t) => req('POST', '/tenants', t),

  students: () => req('GET', '/students'),
  createStudent: (s) => req('POST', '/students', s),
  updateStudent: (id, s) => req('PUT', `/students/${id}`, s),
  deleteStudent: (id) => req('DELETE', `/students/${id}`),

  evaluations: (sid) => req('GET', `/evaluations/${sid}`),
  saveEvaluation: (sid, metrics) => req('POST', `/evaluations/${sid}`, { metrics }),

  attendanceForDate: (date) => req('GET', `/attendance/${date}`),
  saveAttendance: (date, entries) => req('POST', `/attendance/${date}`, { entries }),
  attendanceSummary: (sid) => req('GET', `/attendance/summary/${sid}`),

  analytics: () => req('GET', '/analytics/summary'),
  billing: () => req('GET', '/billing'),

  users: () => req('GET', '/users'),
  createUser: (u) => req('POST', '/users', u),

  // CSV needs the auth header, so fetch as a blob and trigger a download.
  async downloadCsv() {
    const headers = { Authorization: `Bearer ${store.token}` };
    if (store.isSuper() && store.tenantId) headers['X-Tenant-Id'] = store.tenantId;
    const res = await fetch('/api/export/students.csv', { headers });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sams_${store.tenantId || 'export'}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
};
