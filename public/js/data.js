// data.js — central data refreshers shared by views.
import { api } from './api.js';
import { store, toast } from './store.js';
import { renderDashboard, initDashboard } from './modules/dashboard.js';

let dashboardInitialized = false;

export async function reloadStudents() {
  try {
    const response = await api.students();
    // API returns paginated object {total, limit, offset, students}
    const list = response.students || response;  // fallback for old format
    store.setStudents(Array.isArray(list) ? list : []);
    if (store.can('analytics:read')) await reloadAnalytics();
  } catch (e) {
    toast(e.message, true);
  }
}

export async function reloadAnalytics() {
  if (!store.can('analytics:read')) return;
  try {
    renderDashboard(await api.analytics());
    if (!dashboardInitialized) { initDashboard(); dashboardInitialized = true; }
  } catch (e) {
    toast(e.message, true);
  }
}
