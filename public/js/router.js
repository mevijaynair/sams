// router.js — permission-filtered sidebar nav + single active view.
import { store } from './store.js';

export const NAV = [
  { view: 'dashboard',   label: 'Dashboard',     title: 'Dashboard',          perm: 'analytics:read' },
  { view: 'students',    label: 'Students',      title: 'Students',           perm: 'students:read' },
  { view: 'attendance',  label: 'Attendance',    title: 'Attendance Roster',  perm: 'attendance:read' },
  { view: 'performance', label: 'Performance',   title: 'Pitch Performance',  perm: 'performance:read' },
  { view: 'billing',     label: 'Billing',       title: 'Billing',            perm: 'billing:read' },
  { view: 'parents',     label: 'Parents',       title: 'Parent / Guardian Management', perm: 'students:read' },
  { view: 'users',       label: 'Staff & Roles', title: 'Staff & Roles',      perm: 'users:manage' },
  { view: 'audit',       label: 'Audit Log',     title: 'Audit Log & Compliance',  perm: 'users:manage' },
  { view: 'settings',    label: 'Academies',     title: 'Academies',          perm: 'tenants:manage' }
];

let current = null;

// Feather-style line icons (inherit color via currentColor).
const I = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICONS = {
  dashboard:   I('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
  students:    I('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  attendance:  I('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  performance: I('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
  billing:     I('<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>'),
  parents:     I('<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="6" cy="7" r="3"/><circle cx="14" cy="7" r="3"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  users:       I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/>'),
  audit:       I('<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-5-3-v-4.9z"/>'),
  settings:    I('<path d="M3 21V7l9-4 9 4v14"/><path d="M9 21v-6h6v6"/><line x1="3" y1="21" x2="21" y2="21"/>')
};

export function buildNav() {
  const nav = document.getElementById('nav');
  const allowed = NAV.filter(n => store.can(n.perm));
  nav.innerHTML = allowed.map(n =>
    `<button data-view="${n.view}">${ICONS[n.view] || ''}<span>${n.label}</span></button>`).join('');
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
