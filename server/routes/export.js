// routes/export.js — CSV export. Scoped to the current tenant by default.
import { Router } from 'express';
import * as Students from '../repos/students.js';

const router = Router();

const HEADERS = [
  'TenantID', 'StudentID', 'Name', 'AgeGroup', 'EmiratesID', 'EIDExpiry',
  'BillingStructure', 'MonthlyFee', 'PaymentStatus', 'LastPayment',
  'FreezeRange', 'AccountStatus', 'ExitReason', 'CreatedAt'
];

router.get('/students.csv', (req, res) => {
  const rows = Students.list(req.tenantId);
  const lines = [HEADERS.join(',')];
  for (const s of rows) {
    lines.push([
      s.tenant_id, s.id, s.name, s.age_group, s.eid_number, s.eid_expiry,
      s.billing_structure, s.monthly_fee, s.payment_status, s.last_payment_date,
      s.freeze_range, s.account_status, s.exit_reason, s.created_at
    ].map(csvCell).join(','));
  }
  const csv = lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="sams_${req.tenantId}_${Date.now()}.csv"`);
  res.send(csv);
});

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default router;
