// roster.js — central registry table with edit/delete + CSV export.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc, isEidExpired } from '../util.js';
import { reloadStudents } from '../data.js';
import { editStudent } from './admin.js';

const $ = (id) => document.getElementById(id);

function render() {
  const tbody = $('rosterTable').querySelector('tbody');
  if (!store.students.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="hint">No records for this tenant yet.</td></tr>';
    return;
  }
  tbody.innerHTML = store.students.map(s => {
    const expired = isEidExpired(s.eid_expiry);
    const eidLine = s.eid_number
      ? `<div style="font-size:0.85rem;">${esc(s.eid_number)}</div>
         <div style="font-size:0.75rem; ${expired ? 'color:var(--danger);font-weight:600;' : 'color:var(--text-muted);'}">
           Exp: ${esc(s.eid_expiry) || '—'} ${expired ? '(EXPIRED)' : ''}</div>`
      : '<span class="hint">No EID</span>';
    const fee = Number(s.monthly_fee) ? `AED ${Number(s.monthly_fee).toLocaleString()}` : '—';
    return `<tr>
      <td><div style="font-weight:600;">${esc(s.name)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">ID: ${esc(s.id).slice(0, 8)}</div></td>
      <td><span class="tenant-badge" style="background:#27272a;color:#fff;border:none;">${esc(s.age_group)}</span></td>
      <td>${eidLine}</td>
      <td><div>${esc(s.billing_structure)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">${esc(s.freeze_range || s.discount_note || fee)}</div></td>
      <td><span class="tag tag-${esc(s.payment_status.toLowerCase())}">${esc(s.payment_status)}</span></td>
      <td><span class="tag tag-${esc(s.account_status.toLowerCase())}">${esc(s.account_status)}${
            s.exit_reason ? ` (${esc(s.exit_reason)})` : ''}</span></td>
      <td style="font-size:0.8rem;color:var(--text-muted);">AED ${Number(s.monthly_fee).toLocaleString()}/mo</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" data-edit="${s.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${s.id}">✕</button>
      </td>
    </tr>`;
  }).join('');
}

export function initRoster() {
  $('rosterTable').addEventListener('click', async (e) => {
    const editId = e.target.dataset.edit;
    const delId = e.target.dataset.del;
    if (editId) return editStudent(editId);
    if (delId) {
      const s = store.getStudent(delId);
      if (!confirm(`Remove ${s?.name}? This deletes their evaluations and attendance too.`)) return;
      try {
        await api.deleteStudent(delId);
        toast('Record removed');
        await reloadStudents();
      } catch (err) { toast(err.message, true); }
    }
  });

  $('exportCsv').addEventListener('click', () => {
    window.location.href = api.exportUrl();
  });

  store.subscribe(render);
}
