// main.js — bootstrap: auth gate, nav, tenant switching, per-view data loads.
import { api } from './api.js';
import { store, toast } from './store.js';
import { reloadStudents, reloadAnalytics } from './data.js';
import { buildNav, showView, defaultView } from './router.js';
import { initAdmin } from './modules/admin.js';
import { initPitch } from './modules/pitch.js';
import { initAttendance } from './modules/attendance.js';
import { initRoster } from './modules/roster.js';
import { initComms } from './modules/comms.js';
import { initBilling, loadBilling } from './modules/billing.js';
import { initUsers, loadUsers } from './modules/users.js';
import { initSettings, loadTenants } from './modules/settings.js';

const $ = (id) => document.getElementById(id);

const DEV_ACCOUNTS = [
  { email: 'super@sams.dev', password: 'super123', label: 'Super Admin' },
  { email: 'admin@apex.dev', password: 'admin123', label: 'Academy Admin (Apex)' },
  { email: 'football@apex.dev', password: 'coach123', label: 'Coach · Football' },
  { email: 'cricket@apex.dev', password: 'coach123', label: 'Coach · Cricket' }
];

let modulesReady = false;

function initModulesOnce() {
  if (modulesReady) return;
  initAdmin(); initPitch(); initAttendance(); initRoster(); initComms();
  initBilling(); initUsers(); initSettings();
  modulesReady = true;
}

// ---- auth screens ----
function showLogin() {
  $('appShell').hidden = true;
  $('loginView').hidden = false;
}

async function enterApp(user) {
  store.user = user;
  // Tenant: super admin picks one; others are locked to theirs.
  store.tenantId = store.isSuper() ? null : user.tenant_id;

  $('loginView').hidden = true;
  $('appShell').hidden = false;
  $('userName').textContent = user.name;
  $('userRole').textContent = user.roleLabel;

  await setupTenantSelector();
  initModulesOnce();
  buildNav();
  await refreshActiveData();          // initial load
  showView(defaultView());
}

async function setupTenantSelector() {
  const sel = $('tenantSelector');
  if (!store.isSuper()) { sel.hidden = true; return; }
  const tenants = await api.tenants();
  sel.hidden = false;
  sel.innerHTML = tenants.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (!store.tenantId) store.tenantId = tenants[0]?.id || null;
  sel.value = store.tenantId;
}

// Load the shared student list + analytics (used by most views).
async function refreshActiveData() {
  if (store.can('students:read')) await reloadStudents();
  else if (store.can('analytics:read')) await reloadAnalytics();
}

// ---- wiring ----
function wireAuth() {
  $('quickLogin').innerHTML = DEV_ACCOUNTS.map((a, i) =>
    `<button class="btn btn-secondary btn-sm" data-i="${i}">${a.label}</button>`).join('');
  $('quickLogin').querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => {
      const a = DEV_ACCOUNTS[b.dataset.i];
      $('loginEmail').value = a.email; $('loginPassword').value = a.password;
      doLogin(a.email, a.password);
    }));

  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    doLogin($('loginEmail').value, $('loginPassword').value);
  });

  $('logoutBtn').addEventListener('click', async () => {
    try { await api.logout(); } catch { /* ignore */ }
    store.setToken(null); store.user = null; store.students = [];
    showLogin();
  });

  window.addEventListener('sams:logout', showLogin);

  $('tenantSelector').addEventListener('change', async (e) => {
    store.tenantId = e.target.value;
    await refreshActiveData();
    reloadCurrentView();
  });

  // Per-view lazy loads for data not in the shared student cache.
  window.addEventListener('sams:view', (e) => {
    if (e.detail === 'dashboard') reloadAnalytics();
    if (e.detail === 'billing') loadBilling();
    if (e.detail === 'users') loadUsers();
    if (e.detail === 'settings') loadTenants();
  });
}

function reloadCurrentView() {
  const active = document.querySelector('.view:not([hidden])');
  if (active) window.dispatchEvent(new CustomEvent('sams:view', { detail: active.dataset.view }));
}

async function doLogin(email, password) {
  $('loginError').textContent = '';
  try {
    const { token, user } = await api.login(email, password);
    store.setToken(token);
    await enterApp(user);
  } catch (err) {
    $('loginError').textContent = err.message || 'Login failed';
  }
}

// ---- start ----
async function start() {
  wireAuth();
  if (store.token) {
    try {
      const { user } = await api.me();   // resume an existing session
      await enterApp(user);
      return;
    } catch { store.setToken(null); }
  }
  showLogin();
}

window.addEventListener('DOMContentLoaded', start);
