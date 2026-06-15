// pitch.js — age-group performance evaluation matrix + save log.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { AGE_METRICS } from '../config.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

function renderMetricInputs(ageGroup, existing = {}) {
  const defs = AGE_METRICS[ageGroup] || [];
  const c = $('dynamicMetricContainer');
  if (!defs.length) { c.innerHTML = '<p class="muted">Unknown age group.</p>'; return; }
  c.innerHTML = defs.map(d => {
    const val = existing[d.key] ?? d.def;
    if (d.type === 'select') {
      const opts = d.options.map(o =>
        `<option ${String(o) === String(val) ? 'selected' : ''}>${esc(o)}</option>`).join('');
      return `<div class="form-group"><label>${esc(d.label)}</label>
        <select data-key="${d.key}">${opts}</select></div>`;
    }
    return `<div class="form-group"><label>${esc(d.label)}</label>
      <input type="number" data-key="${d.key}" value="${esc(val)}"
        ${d.min != null ? `min="${d.min}"` : ''} ${d.max != null ? `max="${d.max}"` : ''}></div>`;
  }).join('');
}

async function onSelectPlayer() {
  const id = $('perfPlayerSelect').value;
  $('perfHistory').textContent = '';
  if (!id) {
    $('dynamicMetricContainer').innerHTML =
      '<p class="muted">Select a player to unlock specialized developmental scoring profiles.</p>';
    return;
  }
  const s = store.getStudent(id);
  let existing = {};
  try {
    const logs = await api.evaluations(id);
    if (logs.length) {
      existing = logs[0].metrics;
      $('perfHistory').textContent =
        `${logs.length} evaluation(s) on file · last ${new Date(logs[0].recorded_at).toLocaleDateString()}`;
    } else {
      $('perfHistory').textContent = 'No evaluations on file yet.';
    }
  } catch (e) { toast(e.message, true); }
  renderMetricInputs(s.age_group, existing);
}

function populateDropdown() {
  const sel = $('perfPlayerSelect');
  const prev = sel.value;
  sel.innerHTML = '<option value="">Select committed player to evaluate...</option>' +
    store.students.filter(s => s.account_status === 'Active')
      .map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.age_group)})</option>`).join('');
  if (store.getStudent(prev)) sel.value = prev;
}

export function initPitch() {
  $('perfPlayerSelect').addEventListener('change', onSelectPlayer);
  $('perfSave').addEventListener('click', async () => {
    const id = $('perfPlayerSelect').value;
    if (!id) return toast('Select a player to evaluate', true);
    const metrics = {};
    $('dynamicMetricContainer').querySelectorAll('[data-key]').forEach(el => {
      metrics[el.dataset.key] = el.value;
    });
    try {
      await api.saveEvaluation(id, metrics);
      toast('Pitch evaluation logged');
      onSelectPlayer();
    } catch (e) { toast(e.message, true); }
  });
  store.subscribe(populateDropdown);
}
