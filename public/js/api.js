// api.js — thin fetch wrapper. Injects the active tenant header on every call.
import { store } from './store.js';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'X-Tenant-Id': store.tenantId || '' }
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  tenants: () => req('GET', '/tenants'),

  students: () => req('GET', '/students'),
  createStudent: (s) => req('POST', '/students', s),
  updateStudent: (id, s) => req('PUT', `/students/${id}`, s),
  deleteStudent: (id) => req('DELETE', `/students/${id}`),

  evaluations: (studentId) => req('GET', `/evaluations/${studentId}`),
  saveEvaluation: (studentId, metrics) => req('POST', `/evaluations/${studentId}`, { metrics }),

  attendanceForDate: (date) => req('GET', `/attendance/${date}`),
  saveAttendance: (date, entries) => req('POST', `/attendance/${date}`, { entries }),
  attendanceSummary: (studentId) => req('GET', `/attendance/summary/${studentId}`),

  analytics: () => req('GET', '/analytics/summary'),

  exportUrl: () => `/api/export/students.csv?tenant=${encodeURIComponent(store.tenantId)}`
};
