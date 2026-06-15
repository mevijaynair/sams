// settings.js — academy (tenant) administration (super admin only).
import { api } from '../api.js';
import { toast } from '../store.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

export function initSettings() {
  $('tenantForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('t_name').value.trim();
    if (!name) return toast('Academy name required', true);
    try {
      await api.createTenant({ name });
      toast('Academy created');
      $('tenantForm').reset();
      loadTenants();
    } catch (err) { toast(err.message, true); }
  });
}

export async function loadTenants() {
  let tenants;
  try { tenants = await api.tenants(); } catch (e) { return toast(e.message, true); }
  const tbody = $('tenantsTable').querySelector('tbody');
  tbody.innerHTML = tenants.map(t => `
    <tr><td><code>${esc(t.id)}</code></td><td>${esc(t.name)}</td></tr>`).join('')
    || '<tr><td colspan="2" class="hint">No academies.</td></tr>';
}
