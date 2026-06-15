// routes/analytics.js — billing/compliance dashboards and churn analytics.
import { Router } from 'express';
import * as Students from '../repos/students.js';

const router = Router();

const DAY = 86400000;

// GET /api/analytics/summary -> headline numbers for the current tenant.
router.get('/summary', (req, res) => {
  const students = Students.list(req.tenantId);
  const active = students.filter(s => s.account_status === 'Active');
  const now = Date.now();

  const eidExpiring = active.filter(s => {
    if (!s.eid_expiry) return false;
    const t = new Date(s.eid_expiry).getTime();
    return !Number.isNaN(t) && t - now < 60 * DAY; // expired or within 60 days
  });

  const monthlyRevenue = active
    .filter(s => s.billing_structure !== 'Paused')
    .reduce((sum, s) => sum + (Number(s.monthly_fee) || 0), 0);

  const paymentBreakdown = countBy(active, 'payment_status');
  const billingBreakdown = countBy(active, 'billing_structure');

  // Churn: exit-reason tags across exited students.
  const exited = students.filter(s => s.account_status === 'Exited');
  const churnByReason = countBy(exited, 'exit_reason');

  res.json({
    totalStudents: students.length,
    activeStudents: active.length,
    exitedStudents: exited.length,
    monthlyRevenue,
    overdueCount: active.filter(s => s.payment_status === 'Overdue').length,
    dueCount: active.filter(s => s.payment_status === 'Due').length,
    onFreeze: active.filter(s => s.billing_structure === 'Paused').length,
    eidExpiringCount: eidExpiring.length,
    eidExpiring: eidExpiring.map(s => ({
      id: s.id, name: s.name, eid_expiry: s.eid_expiry,
      expired: new Date(s.eid_expiry).getTime() < now
    })),
    paymentBreakdown,
    billingBreakdown,
    churnByReason
  });
});

function countBy(rows, key) {
  const out = {};
  for (const r of rows) {
    const k = r[key] || '—';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export default router;
