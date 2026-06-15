// sportRegistry.js — multi-sport registry table renderer with dynamic metric columns
import { SPORT_CONFIG, getSportNameById } from '../config/sportConfig.js';
import { getMetricHeadersForSport, renderMetricsCells } from './sportDynamics.js';

export function buildRegistryTable(records, options = {}) {
  const {
    onEdit = () => {},
    onDelete = () => {},
    showActions = false
  } = options;

  if (!records || records.length === 0) {
    return `<table class="sams-table"><tbody><tr><td colspan="8" class="empty">No records.</td></tr></tbody></table>`;
  }

  // Gather all unique sports across records
  const sportIds = [...new Set(records.map(r => r.sport_id))];
  const sportNames = sportIds.map(id => getSportNameById(id)).filter(Boolean);

  // Collect metric headers per sport
  const metricsByPort = {};
  sportIds.forEach(sId => {
    metricsByPort[sId] = getMetricHeadersForSport(sId);
  });

  // Build header row
  let headerHtml = '<thead><tr>' +
    '<th>Student</th>' +
    '<th>Sport</th>' +
    '<th>Tier</th>';

  // Add metric columns (grouped by sport, shared label if across sports)
  const metricLabelsSet = new Set();
  sportIds.forEach(sId => {
    metricsByPort[sId].forEach(m => metricLabelsSet.add(m.label));
  });
  metricLabelsSet.forEach(label => {
    headerHtml += `<th><small>${label}</small></th>`;
  });

  headerHtml += '<th>Status</th>';
  if (showActions) headerHtml += '<th></th>';
  headerHtml += '</tr></thead>';

  // Build body rows
  let bodyHtml = records.map(rec => {
    const sportName = getSportNameById(rec.sport_id) || rec.sport_id;
    const tierName = rec.age_tier_name || rec.age_tier_id;

    let row = `<tr>
      <td style="font-weight:600;">${esc(rec.full_name)}</td>
      <td><span style="font-size:0.8rem; color:var(--muted);">${esc(sportName)}</span></td>
      <td><span style="font-size:0.8rem; color:var(--muted);">${esc(tierName)}</span></td>`;

    // Render metrics cells in order of labels
    metricLabelsSet.forEach(label => {
      const metric = Object.values(metricsByPort[rec.sport_id] || {}).find(m => m.label === label);
      if (metric) {
        const val = rec.metrics_payload?.[metric.key];
        const text = val !== undefined ? `${val} ${metric.unit}` : '—';
        row += `<td><small>${text}</small></td>`;
      } else {
        row += '<td>—</td>';
      }
    });

    row += `<td><span style="font-size:0.8rem; color:var(--success);">${rec.account_status || 'Active'}</span></td>`;
    if (showActions) {
      row += `<td><button class="edit-btn" data-id="${rec.id}">✎</button></td>`;
    }
    row += '</tr>';
    return row;
  }).join('');

  const html = `<table class="sams-table">${headerHtml}<tbody>${bodyHtml}</tbody></table>`;

  // Attach event handlers
  setTimeout(() => {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => onEdit(e.target.dataset.id));
    });
  }, 0);

  return html;
}

export function renderRegistrySection(records, options = {}) {
  const table = buildRegistryTable(records, options);
  return `
    <div class="sams-card">
      <div class="card-header">
        <h3 class="card-title">Central Registry · Multi-Sport</h3>
        <span class="card-sub">${records.length} students across ${[...new Set(records.map(r => r.sport_id))].length} sports</span>
      </div>
      <div style="overflow-x:auto;">
        ${table}
      </div>
    </div>
  `;
}

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[c]));
}
