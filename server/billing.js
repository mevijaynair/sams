// billing.js — modular fee computation. Pure functions, no DB access, so the
// rules are easy to test and to reuse on the client for previews.

// Returns { type, label, periodCharge, detail, alert }.
//  - monthly:     flat fee_rate per period (waived while on holiday freeze)
//  - per_session: fee_rate * billable sessions
//  - package:     paid up-front; ongoing charge 0; alerts when sessions run low
export function computeCharge(student, billableSessions = 0) {
  const onFreeze = !!(student.freeze_range && String(student.freeze_range).trim());
  const rate = Number(student.fee_rate) || 0;

  switch (student.fee_plan_type) {
    case 'per_session': {
      const charge = rate * billableSessions;
      return {
        type: 'per_session',
        label: `AED ${rate}/session`,
        periodCharge: charge,
        detail: `${billableSessions} session(s) × AED ${rate}`,
        alert: null
      };
    }
    case 'package': {
      const remaining = Number(student.package_remaining) || 0;
      const total = Number(student.package_sessions) || 0;
      return {
        type: 'package',
        label: `Package ${remaining}/${total} left`,
        periodCharge: 0,
        detail: `AED ${rate} package · ${remaining} of ${total} sessions left`,
        alert: remaining <= 0 ? 'Package exhausted — renewal required'
             : remaining <= 2 ? 'Package running low' : null
      };
    }
    case 'monthly':
    default: {
      return {
        type: 'monthly',
        label: `AED ${rate}/mo`,
        periodCharge: onFreeze ? 0 : rate,
        detail: onFreeze ? `AED ${rate}/mo (frozen: ${student.freeze_range})` : `AED ${rate}/mo`,
        alert: null
      };
    }
  }
}
