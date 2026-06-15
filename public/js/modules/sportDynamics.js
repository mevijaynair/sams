// sportDynamics.js — dynamic form injection + metric rendering for multi-sport forms
import { SPORT_CONFIG, getTiersForSport, getMetricsForTier } from '../config/sportConfig.js';

export function injectTierOptions(sportId, selectElement) {
  const tiers = getTiersForSport(sportId);
  selectElement.innerHTML = '<option value="">Select tier...</option>' +
    tiers.map(t => `<option value="${t.tierId}">${t.name}</option>`).join('');
}

export function injectMetricFields(sportId, tierId, containerElement) {
  const metrics = getMetricsForTier(sportId, tierId);
  const fields = Object.entries(metrics).map(([key, meta]) => {
    const id = `metric_${key}`;
    return `
      <div class="form-group">
        <label for="${id}">${meta.label}</label>
        <div style="display:flex; gap:0.5rem;">
          <input type="number" id="${id}" name="${key}" min="${meta.min||0}" max="${meta.max}"
                 step="${meta.step||1}" placeholder="${meta.unit}">
          <span style="align-self:center; color:var(--muted); font-size:0.8rem;">${meta.unit}</span>
        </div>
      </div>
    `;
  }).join('');
  containerElement.innerHTML = fields || '<p style="color:var(--muted);">No metrics for this tier.</p>';
}

export function collectMetricsFromForm(sportId, tierId) {
  const metrics = getMetricsForTier(sportId, tierId);
  const payload = {};
  for (const key of Object.keys(metrics)) {
    const el = document.getElementById(`metric_${key}`);
    if (el && el.value) payload[key] = parseFloat(el.value);
  }
  return payload;
}

export function renderMetricsCells(record) {
  const metrics = getMetricsForTier(record.sport_id, record.age_tier_id);
  const cells = [];
  for (const [key, meta] of Object.entries(metrics)) {
    const val = record.metrics_payload?.[key];
    const text = val !== undefined ? `${val} ${meta.unit}` : '—';
    cells.push(`<td><small>${text}</small></td>`);
  }
  return cells.join('');
}

export function getMetricHeadersForSport(sportId) {
  const tiers = getTiersForSport(sportId);
  const allMetrics = {};
  tiers.forEach(t => {
    Object.assign(allMetrics, t.metrics);
  });
  return Object.entries(allMetrics).map(([key, meta]) => ({ key, label: meta.label, unit: meta.unit }));
}
