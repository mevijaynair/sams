// attendance.js — pitch-side rapid-tap roster for a session date.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc, todayISO } from '../util.js';

const $ = (id) => document.getElementById(id);
let present = new Set();   // student_ids marked present for the loaded date

async function loadDate() {
  const date = $('attDate').value || todayISO();
  $('attDate').value = date;
  present = new Set();
  try {
    const rows = await api.attendanceForDate(date);
    rows.forEach(r => { if (r.present) present.add(r.student_id); });
  } catch (e) { toast(e.message, true); }
  render();
}

function render() {
  const active = store.students.filter(s => s.account_status === 'Active');
  const list = $('attList');
  if (!active.length) { list.innerHTML = '<p class="hint">No active students for this tenant.</p>'; return; }
  list.innerHTML = active.map(s => {
    const on = present.has(s.id);
    return `<div class="att-row ${on ? 'present' : ''}" data-id="${s.id}">
      <div><div class="who">${esc(s.name)}</div><div class="meta">${esc(s.age_group)}</div></div>
      <span class="att-pill">${on ? 'PRESENT' : 'Absent'}</span>
    </div>`;
  }).join('');
}

export function initAttendance() {
  $('attDate').value = todayISO();
  $('attDate').addEventListener('change', loadDate);

  $('attList').addEventListener('click', (e) => {
    const row = e.target.closest('.att-row');
    if (!row) return;
    const id = row.dataset.id;
    if (present.has(id)) present.delete(id); else present.add(id);
    render();
  });

  $('attAllPresent').addEventListener('click', () => {
    store.students.filter(s => s.account_status === 'Active').forEach(s => present.add(s.id));
    render();
  });

  $('attSave').addEventListener('click', async () => {
    const date = $('attDate').value || todayISO();
    const entries = store.students
      .filter(s => s.account_status === 'Active')
      .map(s => ({ student_id: s.id, present: present.has(s.id) }));
    try {
      const { saved } = await api.saveAttendance(date, entries);
      toast(`Attendance committed (${saved} records) for ${date}`);
    } catch (e) { toast(e.message, true); }
  });

  // Re-render when the student list changes (tenant switch / new enrolment).
  store.subscribe(loadDate);
}
