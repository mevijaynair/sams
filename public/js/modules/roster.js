// roster.js — central enrolment registry (Students view): enrolment + compliance
// columns, single-sport academies hide the Sport column. Performance metrics live
// in the Performance view's matrix, not here.
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

function eidCell(s) {
  if (!s.eid_number) return '<span class="hint">—</span>';
  const expired = isEidExpired(s.eid_expiry);
  const flag = expired ? ' <span class="tag tag-overdue">expired</span>' : '';
  return `${esc(s.eid_number)}${flag}`;
}

function render() {
  const tbody = $('rosterTable')?.querySelector('tbody');
  if (!tbody) return;
  const canWrite = store.can('students:write');

  if (!store.students.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="hint">No students for this view.</td></tr>';
    return;
  }

  tbody.innerHTML = store.students.map(s => {
    const payStatus = (s.payment_status || 'Due').toLowerCase();
    const acct = (s.account_status || 'Active');
    const acctTag = acct === 'Active' ? 'tag-active' : 'tag-exited';
    return `<tr>
      <td style="font-weight:600;">${esc(s.name)}</td>
      <td class="sport-scoped"><span class="tag">${esc(s.sport)}</span></td>
      <td>${esc(s.age_group || '—')}</td>
      <td style="font-size:0.82rem;">${eidCell(s)}</td>
      <td>${esc(planCell(s))}</td>
      <td><span class="tag tag-${esc(payStatus)}">${esc(s.payment_status || 'Due')}</span></td>
      <td><span class="tag ${acctTag}">${esc(acct)}</span></td>
      <td style="white-space:nowrap; text-align:right;">${canWrite ? `
        <button class="btn btn-secondary btn-sm" data-edit="${s.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${s.id}">✕</button>` : ''}</td>
    </tr>`;
  }).join('');
}

export function initRoster() {
  $('rosterTable').addEventListener('click', async (e) => {
    const editId = e.target.closest('[data-edit]')?.dataset.edit;
    const delId = e.target.closest('[data-del]')?.dataset.del;
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
