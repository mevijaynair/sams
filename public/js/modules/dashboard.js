// dashboard.js — KPI strip + billing/payment/churn bars + EID watchlist.
const $ = (id) => document.getElementById(id);

export function renderDashboard(a) {
  const kpis = [
    { l: 'Active Students', v: a.activeStudents, cls: '' },
    { l: 'Monthly Revenue', v: 'AED ' + a.monthlyRevenue.toLocaleString(), cls: 'good' },
    { l: 'Payments Due', v: a.dueCount, cls: a.dueCount ? 'warn' : '' },
    { l: 'Overdue', v: a.overdueCount, cls: a.overdueCount ? 'bad' : '' },
    { l: 'On Holiday Freeze', v: a.onFreeze, cls: a.onFreeze ? 'warn' : '' },
    { l: 'EID Expiring/Expired', v: a.eidExpiringCount, cls: a.eidExpiringCount ? 'bad' : '' },
    { l: 'Exited (Churn)', v: a.exitedStudents, cls: a.exitedStudents ? 'warn' : '' }
  ];
  $('kpiStrip').innerHTML = kpis.map(k =>
    `<div class="kpi ${k.cls}"><div class="v">${k.v}</div><div class="l">${k.l}</div></div>`
  ).join('');

  bars('billingBars', a.billingBreakdown);
  bars('paymentBars', a.paymentBreakdown);
  bars('churnBars', a.churnByReason, 'No churn recorded for this tenant.');

  const wl = a.eidExpiring || [];
  $('eidWatchlist').innerHTML = wl.length
    ? wl.map(s => `<div>• <strong>${esc(s.name)}</strong> — ${s.eid_expiry} ${
        s.expired ? '<span style="color:var(--danger);font-weight:600;">(EXPIRED)</span>'
                  : '<span style="color:var(--warning);">(expiring soon)</span>'}</div>`).join('')
    : 'All EIDs valid for 60+ days.';
}

function bars(elId, obj, emptyMsg = 'No data.') {
  const entries = Object.entries(obj || {});
  const el = document.getElementById(elId);
  if (!entries.length) { el.innerHTML = `<p class="hint">${emptyMsg}</p>`; return; }
  const max = Math.max(...entries.map(([, v]) => v));
  el.innerHTML = entries.map(([k, v]) => `
    <div class="bar-row">
      <span>${esc(k)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(v / max) * 100}%"></span></span>
      <span style="text-align:right;">${v}</span>
    </div>`).join('');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
