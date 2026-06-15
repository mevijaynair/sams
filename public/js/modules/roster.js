// roster.js — central registry table with edit/delete (gated) + CSV export.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc, isEidExpired } from '../util.js';
import { reloadStudents } from '../data.js';
import { editStudent } from './admin.js';

const $ = (id) => document.getElementById(id);
const PLAN_LABELS = { monthly: 'Monthly', per_session: 'Per session', package: 'Package' };

function planCell(s) {
  if (s.fee_plan_type === 'package') return `Package · ${s.package_remaining}/${s.package_sessions} left`;
  if (s.fee_plan_type === 'per_session') return `AED ${s.fee_rate}/session`;
  return `AED ${s.fee_rate}/mo`;
}

function render() {
  const tbody = $('rosterTable').querySelector('tbody');
  const canWrite = store.can('students:write');
  if (!store.students.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="hint">No students for this view.</td></tr>';
    return;
  }
  tbody.innerHTML = store.students.map(s => {
    const expired = isEidExpired(s.eid_expiry);
    const eidLine = s.eid_number
      ? `<div style="font-size:0.82rem;">${esc(s.eid_number)}</div>
         <div style="font-size:0.72rem; ${expired ? 'color:var(--danger);font-weight:600;' : 'color:var(--text-faint);'}">
           ${esc(s.eid_expiry) || '—'} ${expired ? '(EXPIRED)' : ''}</div>`
      : '<span class="hint">No EID</span>';
    const actions = canWrite
      ? `<button class="btn btn-secondary btn-sm" data-edit="${s.id}">Edit</button>
         <button class="btn btn-danger btn-sm" data-del="${s.id}">✕</button>`
      : '<span class="hint">read-only</span>';
    return `<tr>
      <td><div style="font-weight:500;">${esc(s.name)}</div>
          <div style="font-size:0.72rem;color:var(--text-faint);">${esc(s.id).slice(0, 8)}</div></td>
      <td><span class="tag">${esc(s.sport)}</span></td>
      <td>${esc(s.age_group)}</td>
      <td>${eidLine}</td>
      <td>${esc(planCell(s))}</td>
      <td><span class="tag tag-${esc(s.payment_status.toLowerCase())}">${esc(s.payment_status)}</span></td>
      <td><span class="tag tag-${esc(s.account_status.toLowerCase())}">${esc(s.account_status)}${
            s.exit_reason ? ` (${esc(s.exit_reason)})` : ''}</span></td>
      <td style="white-space:nowrap;">${actions}</td>
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
      if (!confirm(`Remove ${s?.name}? This also deletes their evaluations and attendance.`)) return;
      try { await api.deleteStudent(delId); toast('Record removed'); await reloadStudents(); }
      catch (err) { toast(err.message, true); }
    }
  });

  $('exportCsv').addEventListener('click', async () => {
    try { await api.downloadCsv(); } catch (e) { toast(e.message, true); }
  });

  store.subscribe(render);
}
