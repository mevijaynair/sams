// dashboard.js — KPI strip + sport/plan/payment/churn bars + EID watchlist.
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

export function renderDashboard(a) {
  const kpis = [
    { l: 'Active Students', v: a.activeStudents, cls: '', key: 'students' },
    { l: 'Projected Revenue', v: 'AED ' + (a.projectedRevenue || 0).toLocaleString(), cls: 'good', key: 'revenue' },
    { l: 'Payments Due', v: a.dueCount, cls: a.dueCount ? 'warn' : '', key: 'due' },
    { l: 'Overdue', v: a.overdueCount, cls: a.overdueCount ? 'bad' : '', key: 'overdue' },
    { l: 'On Freeze', v: a.onFreeze, cls: a.onFreeze ? 'warn' : '', key: 'freeze' },
    { l: 'EID Watch', v: a.eidExpiringCount, cls: a.eidExpiringCount ? 'bad' : '', key: 'eid' },
    { l: 'Churn', v: a.exitedStudents, cls: a.exitedStudents ? 'warn' : '', key: 'churn' }
  ];

  $('kpiStrip').innerHTML = kpis.map(k =>
    `<div class="kpi ${k.cls}" data-kpi="${k.key}"><div class="v">${k.v}</div><div class="l">${k.l}</div></div>`).join('');

  // Live count in the sport hero banner.
  const heroCount = $('heroStudentCount');
  if (heroCount) heroCount.textContent = a.activeStudents ?? '—';

  // Attach click handlers
  document.querySelectorAll('.kpi').forEach(el => {
    el.addEventListener('click', (e) => showKpiDetail(e.target.closest('.kpi').dataset.kpi, a));
  });

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

function showKpiDetail(key, data) {
  const modal = $('kpiModal');
  const title = $('kpiModalTitle');
  const body = $('kpiModalBody');

  let titleText = '', html = '';

  if (key === 'students') {
    titleText = 'Active Students';
    const breakdown = data.sportBreakdown || {};
    html = `<div class="calc-item">
      <div class="calc-label">Total Active Students</div>
      <div class="calc-value">${data.activeStudents}</div>
      <div class="calc-detail">By sport: ${Object.entries(breakdown).map(([s, v]) => `${s} (${v})`).join(', ')}</div>
    </div>`;
  } else if (key === 'revenue') {
    titleText = 'Projected Monthly Revenue';
    // Use actual projected revenue from dashboard data (calculated server-side)
    html = `
      <div class="calc-item">
        <div class="calc-label">Total Projected Revenue</div>
        <div class="calc-value">AED ${(data.projectedRevenue || 0).toLocaleString()}</div>
        <div class="calc-detail">Based on ${data.activeStudents || 0} active students and their fee plans.</div>
      </div>`;
  } else if (key === 'due') {
    titleText = 'Payments Due';
    html = `<div class="calc-item">
      <div class="calc-label">Students with payments due</div>
      <div class="calc-value">${data.dueCount}</div>
      <div class="calc-detail">These students have active accounts but unpaid invoices.</div>
    </div>`;
  } else if (key === 'overdue') {
    titleText = 'Overdue Payments';
    html = `<div class="calc-item">
      <div class="calc-label">Students with overdue balances</div>
      <div class="calc-value">${data.overdueCount}</div>
      <div class="calc-detail">These students have payments past 30 days. Follow up recommended.</div>
    </div>`;
  } else if (key === 'freeze') {
    titleText = 'On Holiday Freeze';
    html = `<div class="calc-item">
      <div class="calc-label">Students with freeze ranges active</div>
      <div class="calc-value">${data.onFreeze}</div>
      <div class="calc-detail">These students have holiday or break periods where billing is paused.</div>
    </div>`;
  } else if (key === 'eid') {
    titleText = 'EID Expiry Watch';
    const expiring = data.eidExpiring || [];
    html = expiring.length ? expiring.map(s => `
      <div class="calc-item">
        <div class="calc-label">${esc(s.name)}</div>
        <div class="calc-value" style="color: ${s.expired ? 'var(--danger)' : 'var(--warning)'};">${s.eid_expiry}</div>
        <div class="calc-detail">${s.expired ? 'EXPIRED - Renewal required' : 'Expires within 60 days'}</div>
      </div>`) : '<p class="hint">All EIDs valid for 60+ days.</p>';
  } else if (key === 'churn') {
    titleText = 'Student Churn';
    const reasons = data.churnByReason || {};
    html = Object.entries(reasons).length ? Object.entries(reasons).map(([reason, count]) => `
      <div class="calc-item">
        <div class="calc-label">${esc(reason)}</div>
        <div class="calc-value">${count}</div>
      </div>`).join('') : '<p class="hint">No churn recorded.</p>';
  }

  title.textContent = titleText;
  body.innerHTML = html;
  modal.hidden = false;
}

function closeKpiModal() {
  $('kpiModal').hidden = true;
}

export function initDashboard() {
  $('kpiModalClose').addEventListener('click', closeKpiModal);
  $('kpiModal').addEventListener('click', (e) => {
    if (e.target.id === 'kpiModal') closeKpiModal();
  });
}

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
