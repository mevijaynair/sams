// admin.js — enrolment intake (create + edit): sport, compliance, modular fees.
// Performance metrics are captured in the Performance view (config/sportMetrics.js).
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { reloadStudents } from '../data.js';
import { AGE_GROUPS, FEE_PLANS } from '../config.js';

const $ = (id) => document.getElementById(id);

const RATE_LABELS = {
  monthly: 'Monthly Fee (AED)',
  per_session: 'Rate per Session (AED)',
  package: 'Package Price (AED)'
};

function populateSelects() {
  // Only the sports this academy actually runs (one option for single-sport).
  $('f_sport').innerHTML = store.tenantSports.map(s => `<option value="${s}">${s}</option>`).join('');
  $('f_feePlan').innerHTML = FEE_PLANS.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
  $('f_ageGroup').innerHTML = AGE_GROUPS.map(a => `<option value="${a.value}">${a.label}</option>`).join('');
}

function readForm() {
  return {
    name: $('f_name').value.trim(),
    sport: $('f_sport').value,
    age_group: $('f_ageGroup').value,
    eid_number: $('f_eidNumber').value.trim(),
    eid_expiry: $('f_eidExpiry').value,
    fee_plan_type: $('f_feePlan').value,
    fee_rate: $('f_feeRate').value,
    package_sessions: $('f_pkgTotal').value,
    package_remaining: $('f_pkgRemaining').value,
    freeze_range: $('f_freezeRange').value.trim(),
    payment_status: $('f_paymentStatus').value,
    account_status: $('f_accountStatus').value,
    exit_reason: $('f_accountStatus').value === 'Exited' ? $('f_exitReason').value : ''
  };
}

function applyConditional() {
  const plan = $('f_feePlan').value;
  $('f_rateLabel').textContent = RATE_LABELS[plan] || 'Fee (AED)';
  $('g_package').hidden = plan !== 'package';
  $('g_exit').hidden = $('f_accountStatus').value !== 'Exited';
}

function openForm(show = true) { $('studentForm').hidden = !show; }

function resetForm() {
  $('studentForm').reset();
  $('studentId').value = '';
  $('f_submit').textContent = 'Commit Record';
  $('f_dropzone').textContent = 'Drop compliance documents or click to upload';
  $('f_dropzone').classList.remove('has-file');
  applyConditional();
}

export function editStudent(id) {
  if (!store.can('students:write')) return;
  const s = store.getStudent(id);
  if (!s) return;
  openForm(true);
  $('studentId').value = s.id;
  $('f_name').value = s.name;
  $('f_sport').value = s.sport;
  $('f_ageGroup').value = s.age_group || '';
  $('f_eidNumber').value = s.eid_number || '';
  $('f_eidExpiry').value = s.eid_expiry || '';
  $('f_feePlan').value = s.fee_plan_type;
  $('f_feeRate').value = s.fee_rate;
  $('f_pkgTotal').value = s.package_sessions;
  $('f_pkgRemaining').value = s.package_remaining;
  $('f_freezeRange').value = s.freeze_range || '';
  $('f_paymentStatus').value = s.payment_status;
  $('f_accountStatus').value = s.account_status;
  applyConditional();
  $('f_exitReason').value = s.exit_reason || '';
  $('f_submit').textContent = 'Update Record';
  $('studentForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function initAdmin() {
  populateSelects();
  applyConditional();
  window.addEventListener('sams:tenant', populateSelects);   // re-scope sports on tenant switch

  $('f_feePlan').addEventListener('change', applyConditional);
  $('f_accountStatus').addEventListener('change', applyConditional);
  $('toggleForm').addEventListener('click', () => { resetForm(); openForm($('studentForm').hidden); });
  $('f_cancel').addEventListener('click', () => { resetForm(); openForm(false); });

  $('f_dropzone').addEventListener('click', () => {
    $('f_dropzone').textContent = '✓ scan_eid_mock.pdf attached (mock)';
    $('f_dropzone').classList.add('has-file');
  });

  $('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = readForm();
    if (!payload.name) return toast('Student name is required', true);
    try {
      const id = $('studentId').value;
      if (id) { await api.updateStudent(id, payload); toast('Record updated'); }
      else { await api.createStudent(payload); toast('Student enrolled'); }
      resetForm(); openForm(false);
      await reloadStudents();
    } catch (err) { toast(err.message, true); }
  });
}
