// routes/analytics.js — billing/compliance dashboards, churn, and sport mix.
import { Router } from 'express';
import * as Students from '../repos/students.js';
import { computeCharge } from '../billing.js';

const router = Router();
const DAY = 86400000;

router.get('/summary', (req, res) => {
  const students = Students.list(req.tenantId, req.sportScope);
  const active = students.filter(s => s.account_status === 'Active');
  const now = Date.now();

  const eidExpiring = active.filter(s => {
    if (!s.eid_expiry) return false;
    const t = new Date(s.eid_expiry).getTime();
    return !Number.isNaN(t) && t - now < 60 * DAY;
  });

  let projectedRevenue = 0;
  for (const s of active) {
    const billable = s.fee_plan_type === 'per_session'
      ? Students.attendedCount(req.tenantId, s.id) : 0;
    projectedRevenue += computeCharge(s, billable).periodCharge;
  }

  const exited = students.filter(s => s.account_status === 'Exited');

  res.json({
    totalStudents: students.length,
    activeStudents: active.length,
    exitedStudents: exited.length,
    projectedRevenue: Math.round(projectedRevenue),
    overdueCount: active.filter(s => s.payment_status === 'Overdue').length,
    dueCount: active.filter(s => s.payment_status === 'Due').length,
    onFreeze: active.filter(s => s.freeze_range && s.freeze_range.trim()).length,
    eidExpiringCount: eidExpiring.length,
    eidExpiring: eidExpiring.map(s => ({
      id: s.id, name: s.name, eid_expiry: s.eid_expiry,
      expired: new Date(s.eid_expiry).getTime() < now
    })),
    sportBreakdown: countBy(active, 'sport'),
    planBreakdown: countBy(active, 'fee_plan_type'),
    paymentBreakdown: countBy(active, 'payment_status'),
    churnByReason: countBy(exited, 'exit_reason')
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
