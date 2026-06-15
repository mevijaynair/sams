// dashboard.js — KPI strip + sport/plan/payment/churn bars + EID watchlist.
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

export function renderDashboard(a) {
  const kpis = [
    { l: 'Active Students', v: a.activeStudents, cls: '' },
    { l: 'Projected Revenue', v: 'AED ' + (a.projectedRevenue || 0).toLocaleString(), cls: 'good' },
    { l: 'Payments Due', v: a.dueCount, cls: a.dueCount ? 'warn' : '' },
    { l: 'Overdue', v: a.overdueCount, cls: a.overdueCount ? 'bad' : '' },
    { l: 'On Freeze', v: a.onFreeze, cls: a.onFreeze ? 'warn' : '' },
    { l: 'EID Watch', v: a.eidExpiringCount, cls: a.eidExpiringCount ? 'bad' : '' },
    { l: 'Churn', v: a.exitedStudents, cls: a.exitedStudents ? 'warn' : '' }
  ];
  $('kpiStrip').innerHTML = kpis.map(k =>
    `<div class="kpi ${k.cls}"><div class="v">${k.v}</div><div class="l">${k.l}</div></div>`).join('');

  bars('sportBars', a.sportBreakdown);
  bars('planBars', a.planBreakdown, 'No active plans.');
  bars('paymentBars', a.paymentBreakdown);
  bars('churnBars', a.churnByReason, 'No churn recorded.');

  const wl = a.eidExpiring || [];
  $('eidWatchlist').innerHTML = wl.length
    ? wl.map(s => `<div>• <strong>${esc(s.name)}</strong> — ${s.eid_expiry} ${
        s.expired ? '<span style="color:var(--danger);font-weight:600;">(EXPIRED)</span>'
                  : '<span style="color:var(--warning);">(expiring)</span>'}</div>`).join('')
    : 'All EIDs valid for 60+ days.';
}

const PLAN_LABELS = { monthly: 'Monthly', per_session: 'Per session', package: 'Package' };

function bars(elId, obj, emptyMsg = 'No data.') {
  const entries = Object.entries(obj || {});
  const el = document.getElementById(elId);
  if (!entries.length) { el.innerHTML = `<p class="hint">${emptyMsg}</p>`; return; }
  const max = Math.max(...entries.map(([, v]) => v));
  el.innerHTML = entries.map(([k, v]) => `
    <div class="bar-row">
      <span>${esc(PLAN_LABELS[k] || k)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(v / max) * 100}%"></span></span>
      <span style="text-align:right;">${v}</span>
    </div>`).join('');
}
