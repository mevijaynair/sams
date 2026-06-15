// roster.js — central multi-sport registry table with edit/delete (gated) + CSV export.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc, isEidExpired } from '../util.js';
import { reloadStudents } from '../data.js';
import { editStudent } from './admin.js';
import { buildRegistryTable } from './sportRegistry.js';

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
    tbody.innerHTML = '<tr><td colspan="12" class="hint">No students for this view.</td></tr>';
    return;
  }

  // Enrich records with sport_id and age_tier_id from names (mapping layer)
  const records = store.students.map(s => ({
    ...s,
    sport_id: s.sport?.toLowerCase().replace(/\s+/g, '_'),
    age_tier_id: s.age_group,
    age_tier_name: s.age_group,
    metrics_payload: s.metrics_payload || {}
  }));

  // Use sportRegistry to build multi-sport table
  const html = buildRegistryTable(records, { onEdit: editStudent, showActions: canWrite });

  // Replace entire table (since we're using sportRegistry format)
  const table = document.createElement('div');
  table.innerHTML = html;
  $('rosterTable').parentElement.replaceChild(table.querySelector('table'), $('rosterTable'));
  $('rosterTable').id = 'rosterTable';  // Restore ID

  // Re-attach event listeners after table replacement
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => editStudent(e.target.dataset.edit));
  });
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
