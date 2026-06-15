// billing.js — modular fee breakdown table (loaded when the Billing view opens).
import { api } from '../api.js';
import { toast } from '../store.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);
const PLAN_LABELS = { monthly: 'Monthly', per_session: 'Per session', package: 'Package' };

export function initBilling() { /* no persistent wiring; data loads on view open */ }

export async function loadBilling() {
  let data;
  try { data = await api.billing(); } catch (e) { return toast(e.message, true); }
  $('billingTotal').textContent = `Projected period total: AED ${data.totalProjected.toLocaleString()}`;
  const tbody = $('billingTable').querySelector('tbody');
  if (!data.rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="hint">No active students.</td></tr>'; return;
  }
  tbody.innerHTML = data.rows.map(r => `
    <tr>
      <td style="font-weight:500;">${esc(r.name)}</td>
      <td><span class="tag">${esc(r.sport)}</span></td>
      <td>${esc(PLAN_LABELS[r.plan] || r.plan)}</td>
      <td class="hint">${esc(r.detail)}</td>
      <td>AED ${Number(r.periodCharge).toLocaleString()}</td>
      <td><span class="tag tag-${esc(r.payment_status.toLowerCase())}">${esc(r.payment_status)}</span></td>
      <td>${r.alert ? `<span style="color:var(--warning);font-size:0.8rem;">${esc(r.alert)}</span>` : ''}</td>
    </tr>`).join('');
}
