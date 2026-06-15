// users.js — staff & role administration (requires users:manage).
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc } from '../util.js';
import { SPORTS } from '../config.js';

const $ = (id) => document.getElementById(id);

function availableRoles() {
  // Super admins can mint any role; academy admins can make admins and coaches.
  return store.isSuper()
    ? [['admin', 'Academy Admin'], ['coach', 'Coach'], ['super_admin', 'Super Admin']]
    : [['admin', 'Academy Admin'], ['coach', 'Coach']];
}

function applyConditional() {
  $('u_sportGroup').hidden = $('u_role').value !== 'coach';
}

export function initUsers() {
  $('u_role').innerHTML = availableRoles().map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  $('u_sport').innerHTML = SPORTS.map(s => `<option>${s}</option>`).join('');
  applyConditional();

  $('u_role').addEventListener('change', applyConditional);
  $('toggleUserForm').addEventListener('click', () => { $('userForm').hidden = !$('userForm').hidden; });
  $('u_cancel').addEventListener('click', () => { $('userForm').reset(); $('userForm').hidden = true; applyConditional(); });

  $('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: $('u_name').value.trim(),
      email: $('u_email').value.trim(),
      password: $('u_password').value,
      role: $('u_role').value,
      sport: $('u_role').value === 'coach' ? $('u_sport').value : null
    };
    try {
      await api.createUser(payload);
      toast('User created');
      $('userForm').reset(); $('userForm').hidden = true; applyConditional();
      loadUsers();
    } catch (err) { toast(err.message, true); }
  });
}

export async function loadUsers() {
  let users;
  try { users = await api.users(); } catch (e) { return toast(e.message, true); }
  const tbody = $('usersTable').querySelector('tbody');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight:500;">${esc(u.name)}</td>
      <td>${esc(u.email)}</td>
      <td><span class="role-pill">${esc(u.role)}</span></td>
      <td>${esc(u.sport || '—')}</td>
      <td><span class="tag tag-${u.active ? 'active' : 'exited'}">${u.active ? 'Active' : 'Disabled'}</span></td>
    </tr>`).join('') || '<tr><td colspan="5" class="hint">No staff yet.</td></tr>';
}
