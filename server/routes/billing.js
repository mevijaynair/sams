// routes/billing.js — per-student modular fee breakdown for the Billing view.
import { Router } from 'express';
import * as Students from '../repos/students.js';
import { computeCharge } from '../billing.js';

const router = Router();

router.get('/', (req, res) => {
  const students = Students.list(req.tenantId, req.sportScope)
    .filter(s => s.account_status === 'Active');

  const rows = students.map(s => {
    const billable = s.fee_plan_type === 'per_session'
      ? Students.attendedCount(req.tenantId, s.id) : 0;
    const charge = computeCharge(s, billable);
    return {
      id: s.id, name: s.name, sport: s.sport,
      plan: charge.type, planLabel: charge.label, detail: charge.detail,
      periodCharge: charge.periodCharge, alert: charge.alert,
      payment_status: s.payment_status
    };
  });

  res.json({
    rows,
    totalProjected: Math.round(rows.reduce((n, r) => n + r.periodCharge, 0))
  });
});

export default router;
