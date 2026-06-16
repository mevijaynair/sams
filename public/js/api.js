// api.js — fetch wrapper. Adds the auth token and (for super admins) the active
// tenant header on every call. Handles JWT token refresh automatically.
import { store, toast } from './store.js';

let isRefreshing = false;
let refreshPromise = null;

// Refresh the access token using the httpOnly refresh token
async function refreshAccessToken() {
  // If already refreshing, wait for the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies (httpOnly refreshToken)
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error('Refresh failed');
      }

      const { accessToken } = await res.json();
      // Atomically update token to avoid race condition
      store.setToken(accessToken);
      return accessToken;
    } catch (err) {
      handleUnauthorized();
      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function req(method, path, body, retryCount = 0) {
  const MAX_RETRIES = 1; // Only retry once to avoid infinite loops
  const headers = {};
  if (store.token) headers['Authorization'] = `Bearer ${store.token}`;
  if (store.isSuper() && store.tenantId) headers['X-Tenant-Id'] = store.tenantId;
  const opts = { method, headers, credentials: 'include' }; // Include cookies for refresh token
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res = await fetch(`/api${path}`, opts);

  // If 401, try to refresh the token and retry once
  if (res.status === 401 && store.token && retryCount < MAX_RETRIES) {
    try {
      await refreshAccessToken();
      // Rebuild the request with the new token
      headers['Authorization'] = `Bearer ${store.token}`;
      const retryOpts = { method, headers, credentials: 'include' };
      if (body !== undefined) {
        retryOpts.body = JSON.stringify(body);
      }
      res = await fetch(`/api${path}`, retryOpts);
      // If retry also returns 401, let it fall through to error handling
    } catch {
      handleUnauthorized();
      throw new Error('Session expired');
    }
  }

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
  // Generic HTTP methods (used by all modules)
  get: (path) => req('GET', path),
  post: (path, body) => req('POST', path, body),
  put: (path, body) => req('PUT', path, body),
  delete: (path) => req('DELETE', path),

  login: async (email, password) => {
    const { accessToken, user } = await req('POST', '/auth/login', { email, password });
    store.setToken(accessToken);
    return { token: accessToken, user };
  },
  logout: () => req('POST', '/auth/logout'),
  me: () => req('GET', '/auth/me'),

  tenants: () => req('GET', '/tenants'),
  createTenant: (t) => req('POST', '/tenants', t),

  students: () => req('GET', '/students'),
  createStudent: (s) => req('POST', '/students', s),
  updateStudent: (id, s) => req('PUT', `/students/${id}`, s),
  deleteStudent: (id) => req('DELETE', `/students/${id}`),

  evaluations: (sid) => req('GET', `/evaluations/${sid}`),
  latestEvaluations: () => req('GET', '/evaluations'),
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
    const res = await fetch('/api/export/students.csv', { headers, credentials: 'include' });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sams_${store.tenantId || 'export'}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
};
