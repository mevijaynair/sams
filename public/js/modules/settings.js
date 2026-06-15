// settings.js — academy (tenant) administration (super admin only).
import { api } from '../api.js';
import { toast } from '../store.js';
import { esc } from '../util.js';
import { SPORTS } from '../config.js';

const $ = (id) => document.getElementById(id);

export function initSettings() {
  $('t_sports').innerHTML = SPORTS.map(s =>
    `<label><input type="checkbox" value="${s}">${s}</label>`).join('');

  $('tenantForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('t_name').value.trim();
    const sports = [...$('t_sports').querySelectorAll('input:checked')].map(i => i.value);
    if (!name) return toast('Academy name required', true);
    if (!sports.length) return toast('Pick at least one sport', true);
    try {
      await api.createTenant({ name, sports });
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
    <tr>
      <td><code>${esc(t.id)}</code></td>
      <td>${esc(t.name)}</td>
      <td>${(t.sports || []).map(s => `<span class="tag">${esc(s)}</span>`).join(' ')}</td>
    </tr>`).join('') || '<tr><td colspan="3" class="hint">No academies.</td></tr>';
}
