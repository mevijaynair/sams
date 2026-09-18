// dashboard.js — KPI strip + sport/plan/payment/churn bars + EID watchlist.
import { esc } from '../util.js';
import { api } from '../api.js';
import { store } from '../store.js';

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

  loadMatchStrip();  // next fixture + last result (football)
}

// Dashboard match strip: next scheduled fixture, latest result, and season W-D-L.
async function loadMatchStrip() {
  const strip = $('matchStrip');
  if (!strip || !store.can('fixtures:read')) return;
  let fixtures;
  try { fixtures = await api.fixtures(); } catch { strip.hidden = true; return; }

  const today = new Date().toISOString().slice(0, 10);
  const played = fixtures.filter(f => f.our_score != null && f.opp_score != null);
  const next = fixtures
    .filter(f => f.status === 'Scheduled' && f.match_date >= today)
    .sort((a, b) => a.match_date.localeCompare(b.match_date))[0];
  const last = played.sort((a, b) => b.match_date.localeCompare(a.match_date))[0];

  const res = (f) => f.our_score > f.opp_score ? 'W' : f.our_score < f.opp_score ? 'L' : 'D';
  const w = played.filter(f => res(f) === 'W').length;
  const d = played.filter(f => res(f) === 'D').length;
  const l = played.filter(f => res(f) === 'L').length;
  const fmt = (dt) => { try { return new Date(dt + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return dt; } };

  if (!next && !last) { strip.hidden = true; return; }
  strip.hidden = false;
  strip.innerHTML = `
    <div class="match-card next">
      <div class="mc-label">Next Fixture</div>
      ${next ? `<div class="mc-main">vs ${esc(next.opponent)}</div>
        <div class="mc-sub">${fmt(next.match_date)}${next.kickoff ? ' · ' + esc(next.kickoff) : ''} · ${esc(next.venue)}</div>`
        : `<div class="mc-main muted-main">No fixture scheduled</div><div class="mc-sub">Add one in Fixtures</div>`}
    </div>
    <div class="match-card result">
      <div class="mc-label">Last Result</div>
      ${last ? `<div class="mc-main"><span class="result-pill result-${res(last)}">${res(last)}</span> ${last.our_score}–${last.opp_score}</div>
        <div class="mc-sub">vs ${esc(last.opponent)} · ${fmt(last.match_date)}</div>`
        : `<div class="mc-main muted-main">No results yet</div><div class="mc-sub">Log one in Fixtures</div>`}
    </div>
    <div class="match-card record">
      <div class="mc-label">Season Record</div>
      <div class="mc-main">${w}<span class="rec-wdl">W</span> ${d}<span class="rec-wdl">D</span> ${l}<span class="rec-wdl">L</span></div>
      <div class="mc-sub">${played.length} match${played.length === 1 ? '' : 'es'} played</div>
    </div>`;
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
