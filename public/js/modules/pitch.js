// pitch.js — Performance view: sport-adaptive squad matrix + per-player
// evaluation (stat summary with bars/trend + category-grouped entry form).
// All sport knowledge comes from config/sportMetrics.js (single source).
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc } from '../util.js';
import {
  categoriesFor, metricsFor, keyMetricsFor, metricDef,
  formatValue, normalize, RATING_SCALE
} from '../config/sportMetrics.js';

const $ = (id) => document.getElementById(id);
const canWrite = () => store.can('performance:write');

let latestByStudent = {};            // student_id -> latest metrics object
let matrixSort = { key: null, dir: 1 };

// ── Which sport the matrix/forms operate on ─────────────────────────────────
function activeSport() {
  if (store.isSingleSport()) return store.academySport();
  const sel = $('perfMatrixSport');
  return sel?.value || store.tenantSports[0] || 'Football';
}

// ── Squad Performance Matrix ────────────────────────────────────────────────
function renderMatrix() {
  const wrap = $('perfMatrix');
  if (!wrap) return;
  const sport = activeSport();
  const cols = keyMetricsFor(sport);
  let players = store.students.filter(s => s.account_status === 'Active' && s.sport === sport);

  if (!players.length) {
    wrap.innerHTML = `<p class="hint">No active ${esc(sport)} players to compare yet.</p>`;
    return;
  }

  // Sort by the chosen metric column (respecting higher/lower-is-better).
  if (matrixSort.key) {
    const def = cols.find(c => c.key === matrixSort.key);
    players = [...players].sort((a, b) => {
      const av = parseFloat(latestByStudent[a.id]?.[matrixSort.key]);
      const bv = parseFloat(latestByStudent[b.id]?.[matrixSort.key]);
      const aN = Number.isNaN(av), bN = Number.isNaN(bv);
      if (aN && bN) return 0;
      if (aN) return 1;            // missing values sink to the bottom
      if (bN) return -1;
      return (av - bv) * matrixSort.dir;
    });
  }

  const arrow = (k) => matrixSort.key === k ? (matrixSort.dir === 1 ? ' ▲' : ' ▼') : '';
  const head = `<tr><th>Player</th>${cols.map(c =>
    `<th class="matrix-sort" data-sort="${c.key}" title="Sort by ${esc(c.label)}">${esc(c.label)}${arrow(c.key)}</th>`
  ).join('')}</tr>`;

  const body = players.map(s => {
    const m = latestByStudent[s.id] || {};
    const cells = cols.map(c => {
      const v = m[c.key];
      if (v === undefined || v === null || v === '') return `<td class="hint">—</td>`;
      const pct = Math.round(normalize(c, v) * 100);
      const cls = c.higherIsBetter === false ? 'bar-fill inverse' : 'bar-fill';
      return `<td><div class="metric-cell">
        <span class="metric-val">${esc(formatValue(c, v))}</span>
        <span class="bar-track mini"><span class="${cls}" style="width:${pct}%"></span></span>
      </div></td>`;
    }).join('');
    return `<tr data-player="${s.id}"><td style="font-weight:600;">${esc(s.name)}</td>${cells}</tr>`;
  }).join('');

  wrap.innerHTML = `<table class="sams-table matrix-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

// ── Per-player stat summary (latest values + trend vs previous) ──────────────
function renderSummary(sport, latest, prev) {
  const el = $('perfSummary');
  if (!el) return;
  if (!latest) {
    el.innerHTML = '<p class="hint">No evaluations on file yet — log the first one below.</p>';
    return;
  }
  const blocks = categoriesFor(sport).map(cat => {
    const rows = cat.metrics.map(def => {
      const v = latest[def.key];
      if (v === undefined || v === null || v === '') return '';
      const pct = Math.round(normalize(def, v) * 100);
      const barCls = def.higherIsBetter === false ? 'bar-fill inverse' : 'bar-fill';
      // trend vs previous evaluation
      let trend = '';
      const pv = prev?.[def.key];
      if (pv !== undefined && pv !== null && pv !== '' && !Number.isNaN(parseFloat(pv))) {
        const d = parseFloat(v) - parseFloat(pv);
        if (d !== 0) {
          const good = def.higherIsBetter === false ? d < 0 : d > 0;
          const sign = d > 0 ? '+' : '';
          trend = `<span class="trend ${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${sign}${+d.toFixed(1)}</span>`;
        }
      }
      return `<div class="stat-row">
        <span class="stat-label">${esc(def.label)}</span>
        <span class="bar-track"><span class="${barCls}" style="width:${pct}%"></span></span>
        <span class="stat-val">${esc(formatValue(def, v))} ${trend}</span>
      </div>`;
    }).join('');
    return rows ? `<div class="stat-cat"><h4 class="mini-h">${esc(cat.name)}</h4>${rows}</div>` : '';
  }).join('');
  el.innerHTML = blocks || '<p class="hint">No metrics recorded.</p>';
}

// ── Evaluation entry form (grouped by category) ─────────────────────────────
function renderInputs(sport, existing = {}) {
  const c = $('perfInputs');
  if (!c) return;
  const disabled = canWrite() ? '' : 'disabled';
  c.innerHTML = categoriesFor(sport).map(cat => {
    const fields = cat.metrics.map(def => {
      const val = existing[def.key] ?? def.def ?? '';
      let control;
      if (def.type === 'rating' || def.type === 'select') {
        const opts = (def.type === 'rating' ? RATING_SCALE : def.options || [])
          .map(o => `<option ${String(o) === String(val) ? 'selected' : ''}>${esc(o)}</option>`).join('');
        control = `<select data-key="${def.key}" data-type="${def.type}" ${disabled}>${opts}</select>`;
      } else {
        const max = def.type === 'percent' ? 100 : (def.max ?? '');
        const unit = def.type === 'percent' ? '%' : (def.unit || '');
        control = `<div class="input-unit">
          <input type="number" data-key="${def.key}" data-type="${def.type}" value="${esc(val)}"
            min="${def.min ?? 0}" ${max !== '' ? `max="${max}"` : ''} step="${def.step || 1}" ${disabled}>
          ${unit ? `<span class="unit">${esc(unit)}</span>` : ''}
        </div>`;
      }
      return `<div class="form-group"><label>${esc(def.label)}</label>${control}</div>`;
    }).join('');
    return `<div class="metric-cat">
      <h4 class="mini-h">${esc(cat.name)}</h4>
      <div class="metric-grid">${fields}</div>
    </div>`;
  }).join('');
}

function collectMetrics() {
  const metrics = {};
  $('perfInputs').querySelectorAll('[data-key]').forEach(el => {
    const t = el.dataset.type;
    const raw = el.value;
    if (raw === '') return;
    metrics[el.dataset.key] = (t === 'select') ? raw : (Number.isNaN(parseFloat(raw)) ? raw : parseFloat(raw));
  });
  return metrics;
}

// ── Player selection ────────────────────────────────────────────────────────
async function onSelectPlayer() {
  const id = $('perfPlayerSelect').value;
  $('perfHistory').textContent = '';
  if (!id) {
    $('perfSummary').innerHTML = '<p class="hint">Select a player to view their performance profile.</p>';
    $('perfInputs').innerHTML = '';
    return;
  }
  const s = store.getStudent(id);
  let latest = {}, prev = null;
  try {
    const logs = await api.evaluations(id);
    if (logs.length) {
      latest = logs[0].metrics;
      prev = logs[1]?.metrics || null;
      $('perfHistory').textContent =
        `${logs.length} evaluation(s) · last ${new Date(logs[0].recorded_at).toLocaleDateString()}`;
    } else {
      latest = null;
      $('perfHistory').textContent = 'No evaluations on file yet.';
    }
  } catch (e) { toast(e.message, true); }
  renderSummary(s.sport, latest, prev);
  renderInputs(s.sport, latest || {});
}

// ── Player dropdown (scoped to the active sport) ────────────────────────────
function populateDropdown() {
  const sel = $('perfPlayerSelect');
  if (!sel) return;
  const prev = sel.value;
  const sport = activeSport();
  const suffix = (s) => store.isSingleSport() ? '' : ` · ${esc(s.sport)}`;
  const players = store.students.filter(s => s.account_status === 'Active' && s.sport === sport);
  sel.innerHTML = '<option value="">Select a player to evaluate...</option>' +
    players.map(s => `<option value="${s.id}">${esc(s.name)}${suffix(s)}</option>`).join('');
  if (store.getStudent(prev) && players.some(p => p.id === prev)) sel.value = prev;
}

// Multi-sport academies get a sport switcher above the matrix.
function syncSportFilter() {
  const row = $('perfMatrixSportRow');
  const sel = $('perfMatrixSport');
  if (!row || !sel) return;
  if (store.isSingleSport()) { row.hidden = true; return; }
  row.hidden = false;
  sel.innerHTML = store.tenantSports.map(s => `<option>${esc(s)}</option>`).join('');
}

async function refresh() {
  syncSportFilter();
  populateDropdown();
  try {
    const rows = await api.latestEvaluations();
    latestByStudent = {};
    rows.forEach(r => { latestByStudent[r.student_id] = r.metrics; });
  } catch { /* matrix still renders with — */ }
  renderMatrix();
}

export function initPitch() {
  $('perfPlayerSelect').addEventListener('change', onSelectPlayer);

  $('perfSave').addEventListener('click', async () => {
    if (!canWrite()) return;
    const id = $('perfPlayerSelect').value;
    if (!id) return toast('Select a player', true);
    try {
      await api.saveEvaluation(id, collectMetrics());
      toast('Evaluation logged');
      await onSelectPlayer();
      await refresh();
    } catch (e) { toast(e.message, true); }
  });

  // Matrix column sorting
  $('perfMatrix').addEventListener('click', (e) => {
    const th = e.target.closest('[data-sort]');
    if (!th) return;
    const k = th.dataset.sort;
    if (matrixSort.key === k) matrixSort.dir *= -1;
    else matrixSort = { key: k, dir: -1 };
    renderMatrix();
  });

  // Clicking a matrix row loads that player into the evaluator
  $('perfMatrix').addEventListener('click', (e) => {
    const tr = e.target.closest('[data-player]');
    if (!tr) return;
    $('perfPlayerSelect').value = tr.dataset.player;
    onSelectPlayer();
    $('perfEvalCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const sportSel = $('perfMatrixSport');
  if (sportSel) sportSel.addEventListener('change', () => { populateDropdown(); renderMatrix(); });

  // Re-scope when the academy/tenant changes or the student list reloads.
  window.addEventListener('sams:tenant', () => { syncSportFilter(); });
  store.subscribe(refresh);
}
