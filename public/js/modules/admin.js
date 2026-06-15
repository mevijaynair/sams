// admin.js — enrolment intake form (create + edit) and compliance/billing fields.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { reloadStudents } from '../data.js';

const $ = (id) => document.getElementById(id);

function readForm() {
  return {
    name: $('f_name').value.trim(),
    age_group: $('f_ageGroup').value,
    eid_number: $('f_eidNumber').value.trim(),
    eid_expiry: $('f_eidExpiry').value,
    billing_structure: $('f_billingStructure').value,
    monthly_fee: $('f_monthlyFee').value,
    discount_note: $('f_discountNote').value.trim(),
    freeze_range: $('f_freezeRange').value.trim(),
    payment_status: $('f_paymentStatus').value,
    account_status: $('f_accountStatus').value,
    exit_reason: $('f_accountStatus').value === 'Exited' ? $('f_exitReason').value : ''
  };
}

function applyConditionalFields() {
  $('g_freeze').style.display = $('f_billingStructure').value === 'Paused' ? 'flex' : 'none';
  $('g_discount').style.display = $('f_billingStructure').value === 'Custom' ? 'flex' : 'none';
  $('g_exit').style.display = $('f_accountStatus').value === 'Exited' ? 'flex' : 'none';
}

function resetForm() {
  $('studentForm').reset();
  $('studentId').value = '';
  $('f_submit').textContent = 'Commit Record to SAMS Core';
  $('f_dropzone').textContent = 'Drop compliance documents here or click to upload';
  $('f_dropzone').classList.remove('has-file');
  applyConditionalFields();
}

export function editStudent(id) {
  const s = store.getStudent(id);
  if (!s) return;
  $('studentId').value = s.id;
  $('f_name').value = s.name;
  $('f_ageGroup').value = s.age_group;
  $('f_eidNumber').value = s.eid_number || '';
  $('f_eidExpiry').value = s.eid_expiry || '';
  $('f_billingStructure').value = s.billing_structure;
  $('f_monthlyFee').value = s.monthly_fee;
  $('f_discountNote').value = s.discount_note || '';
  $('f_freezeRange').value = s.freeze_range || '';
  $('f_paymentStatus').value = s.payment_status;
  $('f_accountStatus').value = s.account_status;
  applyConditionalFields();
  $('f_exitReason').value = s.exit_reason || '';
  $('f_submit').textContent = 'Update Record';
  $('adminCard').scrollIntoView({ behavior: 'smooth' });
}

export function initAdmin() {
  $('f_billingStructure').addEventListener('change', applyConditionalFields);
  $('f_accountStatus').addEventListener('change', applyConditionalFields);
  $('f_reset').addEventListener('click', resetForm);

  $('f_dropzone').addEventListener('click', () => {
    // Mock upload slot — real verification scan storage is a paid-tier feature.
    $('f_dropzone').textContent = '✓ scan_eid_mock.pdf attached (mock)';
    $('f_dropzone').classList.add('has-file');
  });

  $('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = readForm();
    if (!payload.name) return toast('Student name is required', true);
    try {
      const id = $('studentId').value;
      if (id) {
        await api.updateStudent(id, payload);
        toast('Record updated');
      } else {
        await api.createStudent(payload);
        toast('Student committed to SAMS Core');
      }
      resetForm();
      await reloadStudents();
    } catch (err) {
      toast(err.message, true);
    }
  });

  applyConditionalFields();
}
