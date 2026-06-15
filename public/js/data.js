// data.js — central data refreshers shared by all modules.
import { api } from './api.js';
import { store, toast } from './store.js';
import { renderDashboard } from './modules/dashboard.js';

export async function reloadStudents() {
  try {
    const list = await api.students();
    store.setStudents(list);          // triggers subscribed re-renders
    await reloadAnalytics();
  } catch (e) {
    toast(e.message, true);
  }
}

export async function reloadAnalytics() {
  try {
    const a = await api.analytics();
    renderDashboard(a);
  } catch (e) {
    toast(e.message, true);
  }
}
