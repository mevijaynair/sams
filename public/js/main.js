// main.js — bootstrap: tenant selection, view toggles, module wiring.
import { api } from './api.js';
import { store, toast } from './store.js';
import { reloadStudents } from './data.js';
import { initAdmin } from './modules/admin.js';
import { initPitch } from './modules/pitch.js';
import { initAttendance } from './modules/attendance.js';
import { initRoster } from './modules/roster.js';
import { initComms } from './modules/comms.js';

const $ = (id) => document.getElementById(id);

async function switchTenant(id) {
  store.tenantId = id;
  localStorage.setItem('sams_tenant', id);
  $('activeTenantDisplay').textContent = `Tenant: ${id}`;
  await reloadStudents();
}

function wireToggles() {
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = $(btn.dataset.toggle);
      el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
    });
  });
}

async function init() {
  // Modules first so their store.subscribe handlers exist before the first load.
  initAdmin();
  initPitch();
  initAttendance();
  initRoster();
  initComms();
  wireToggles();

  let tenants = [];
  try { tenants = await api.tenants(); }
  catch (e) { toast('Cannot reach server: ' + e.message, true); return; }

  const sel = $('tenantSelector');
  sel.innerHTML = tenants.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  sel.addEventListener('change', () => switchTenant(sel.value));

  const saved = localStorage.getItem('sams_tenant');
  const start = tenants.find(t => t.id === saved) ? saved : tenants[0]?.id;
  if (start) { sel.value = start; await switchTenant(start); }
}

window.addEventListener('DOMContentLoaded', init);
