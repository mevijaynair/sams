// routes/export.js — CSV export, scoped to the active tenant (and coach sport).
import { Router } from 'express';
import * as Students from '../repos/students.js';

const router = Router();

const HEADERS = [
  'TenantID', 'StudentID', 'Name', 'Sport', 'AgeGroup', 'EmiratesID', 'EIDExpiry',
  'FeePlan', 'FeeRate', 'PackageRemaining', 'PaymentStatus', 'LastPayment',
  'FreezeRange', 'AccountStatus', 'ExitReason', 'CreatedAt'
];

router.get('/students.csv', (req, res) => {
  const rows = Students.list(req.tenantId, req.sportScope);
  const lines = [HEADERS.join(',')];
  for (const s of rows) {
    lines.push([
      s.tenant_id, s.id, s.name, s.sport, s.age_group, s.eid_number, s.eid_expiry,
      s.fee_plan_type, s.fee_rate, s.package_remaining, s.payment_status, s.last_payment_date,
      s.freeze_range, s.account_status, s.exit_reason, s.created_at
    ].map(csvCell).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="sams_${req.tenantId}_${Date.now()}.csv"`);
  res.send(lines.join('\r\n'));
});

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default router;
