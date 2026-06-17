// main.js — bootstrap: auth gate, nav, tenant switching, per-view data loads.
import { api } from './api.js';
import { store, toast } from './store.js';
import { reloadStudents, reloadAnalytics } from './data.js';
import { buildNav, showView, defaultView } from './router.js';
import { initAdmin } from './modules/admin.js';
import { initPitch } from './modules/pitch.js';
import { initAttendance } from './modules/attendance.js';
import { initRoster } from './modules/roster.js';
import { initBilling, loadBilling } from './modules/billing.js';
import { initUsers, loadUsers } from './modules/users.js';
import { initSettings, loadTenants } from './modules/settings.js';
import { initParents } from './modules/parents.js';
import { initAudit } from './modules/audit.js';
import { sportIcon, sportKey, allSportClasses, fieldPattern } from './graphics.js';
import { initTheme } from './theme.js';

const $ = (id) => document.getElementById(id);

let DEV_ACCOUNTS = []; // populated at runtime from server (dev mode only)
let DEV_MODE_VISIBLE = false; // dev panel visibility toggle

let modulesReady = false;

function initModulesOnce() {
  if (modulesReady) return;
  initAdmin(); initPitch(); initAttendance(); initRoster();
  initBilling(); initUsers(); initSettings(); initParents(); initAudit();
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
  $('userRole').className = 'role-pill role-' + (user.role === 'super_admin' ? 'super' : user.role);
  $('userAvatar').textContent = initials(user.name);

  await setupTenantSelector();
  applyTenant();                      // sets sports + single-sport mode + context
  initModulesOnce();                  // modules read store.tenantSports on init
  buildNav();
  await refreshActiveData();          // initial load
  showView(defaultView());
}

function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

let tenantsById = {};

// Recompute the active academy's sports, toggle single-sport mode, set context.
function applyTenant() {
  const sports = store.isSuper()
    ? (tenantsById[store.tenantId]?.sports || ['Football'])
    : (store.user?.tenantSports || ['Football']);
  store.tenantSports = sports;
  document.body.classList.toggle('single-sport', store.isSingleSport());

  const academy = store.isSuper()
    ? (tenantsById[store.tenantId]?.name || '')
    : (store.user?.tenantName || '');
  $('pageContext').textContent = store.isSingleSport()
    ? `${academy} · ${sports[0]}` : academy;

  applySportTheme(academy, sports);

  // Let already-initialised modules re-scope their sport selects to this academy.
  window.dispatchEvent(new CustomEvent('sams:tenant'));
}

// Drives per-sport color identity + graphics (brand mark, topbar icon, hero).
function applySportTheme(academy, sports) {
  const single = store.isSingleSport();
  const sport = single ? sports[0] : null;

  // Body class drives the --sport CSS variables (color identity).
  document.body.classList.remove(...allSportClasses());
  if (single) document.body.classList.add(`sport-${sportKey(sport)}`);

  // Brand mark + topbar icon reflect the active sport (multi-sport keeps the "S").
  const brand = $('brandMark');
  if (brand) brand.innerHTML = single ? sportIcon(sport, 22) : 'S';

  const topSport = $('topbarSport');
  if (topSport) {
    topSport.hidden = !single;
    if (single) topSport.innerHTML = sportIcon(sport, 20);
  }

  // Dashboard hero banner.
  const hero = $('sportHero');
  if (hero) {
    hero.hidden = false;
    const label = single ? sport : `${sports.length} sports`;
    hero.innerHTML = `
      ${fieldPattern()}
      <div class="hero-icon">${sportIcon(sport || 'default', 38)}</div>
      <div class="hero-text">
        <div class="hero-eyebrow">${single ? 'Academy Programme' : 'Multi-Sport Club'}</div>
        <div class="hero-title">${academy || 'Academy'}</div>
        <div class="hero-sub">${label} · performance, attendance &amp; billing</div>
      </div>
      <div class="hero-stat"><div class="hs">
        <span class="hs-v" id="heroStudentCount">—</span>
        <span class="hs-l">Active students</span>
      </div></div>`;
  }
}

async function setupTenantSelector() {
  const sel = $('tenantSelector');
  const tenants = await api.tenants();          // own tenant for non-super; all for super
  tenantsById = Object.fromEntries(tenants.map(t => [t.id, t]));
  if (!store.isSuper()) { sel.hidden = true; return; }
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
async function wireAuth() {
  // Fetch dev accounts from server (development-only endpoint)
  try {
    const res = await fetch('/api/auth/dev-accounts');
    if (res.ok) {
      const { accounts } = await res.json();
      DEV_ACCOUNTS = accounts;
      // Hide dev panel by default; show only if visible toggle is on
      $('quickLogin').innerHTML = DEV_ACCOUNTS.map((a, i) =>
        `<button class="btn btn-secondary btn-sm" data-i="${i}">${a.label}</button>`).join('');
      updateDevPanelVisibility();
      // Attach dev-login handlers
      $('quickLogin').querySelectorAll('button').forEach(b =>
        b.addEventListener('click', async () => {
          const a = DEV_ACCOUNTS[b.dataset.i];
          try {
            const res = await fetch('/api/auth/dev-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: a.email })
            });
            if (res.ok) {
              const { accessToken, user } = await res.json();
              store.setToken(accessToken);
              await enterApp(user);
            } else {
              toast('Dev login failed', 'error');
            }
          } catch (e) {
            toast('Dev login error: ' + e.message, 'error');
          }
        }));
    }
  } catch { /* dev not available */ }

  // Keyboard shortcut to toggle dev panel visibility: Ctrl+Shift+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      DEV_MODE_VISIBLE = !DEV_MODE_VISIBLE;
      updateDevPanelVisibility();
      e.preventDefault();
    }
  });

  function updateDevPanelVisibility() {
    const panel = document.querySelector('.dev-panel');
    if (panel) {
      panel.style.display = DEV_MODE_VISIBLE && DEV_ACCOUNTS.length > 0 ? 'block' : 'none';
    }
  }

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
    applyTenant();                       // also broadcasts sams:tenant for module re-scope
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
  initTheme();   // wire the dark/light toggle + apply saved preference
  await wireAuth();  // fetch dev accounts from server (dev mode only)
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
