// router.js — permission-filtered sidebar nav + single active view.
import { store } from './store.js';

export const NAV = [
  { view: 'dashboard',   label: 'Dashboard',     title: 'Dashboard',          perm: 'analytics:read' },
  { view: 'students',    label: 'Students',      title: 'Students',           perm: 'students:read' },
  { view: 'attendance',  label: 'Attendance',    title: 'Attendance Roster',  perm: 'attendance:read' },
  { view: 'performance', label: 'Performance',   title: 'Pitch Performance',  perm: 'performance:read' },
  { view: 'billing',     label: 'Billing',       title: 'Billing',            perm: 'billing:read' },
  { view: 'comms',       label: 'Parent Comms',  title: 'Parent Communications', perm: 'comms:read' },
  { view: 'users',       label: 'Staff & Roles', title: 'Staff & Roles',      perm: 'users:manage' },
  { view: 'settings',    label: 'Academies',     title: 'Academies',          perm: 'tenants:manage' }
];

let current = null;

export function buildNav() {
  const nav = document.getElementById('nav');
  const allowed = NAV.filter(n => store.can(n.perm));
  nav.innerHTML = allowed.map(n =>
    `<button data-view="${n.view}">${n.label}</button>`).join('');
  nav.querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.view)));
  return allowed;
}

export function showView(view) {
  const meta = NAV.find(n => n.view === view);
  if (!meta || !store.can(meta.perm)) return;
  current = view;

  document.querySelectorAll('.view').forEach(el => { el.hidden = el.dataset.view !== view; });
  document.querySelectorAll('#nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('pageTitle').textContent = meta.title;

  // Hide write-only controls if the user lacks the permission.
  document.querySelectorAll('[data-perm]').forEach(el => {
    el.hidden = !store.can(el.dataset.perm);
  });

  window.dispatchEvent(new CustomEvent('sams:view', { detail: view }));
}

export function defaultView() {
  const allowed = NAV.filter(n => store.can(n.perm));
  return allowed[0]?.view || 'dashboard';
}

export function currentView() { return current; }
