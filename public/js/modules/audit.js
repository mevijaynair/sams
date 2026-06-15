// audit.js — audit log viewer for compliance and admin accountability
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

let auditLogs = [];

export function initAudit() {
  const canViewAudit = store.can('users:manage') || store.user?.role === 'super_admin' || store.user?.role === 'super_super_admin';
  if (!canViewAudit) {
    return;  // Hide audit for non-admins
  }

  $('auditFilter').addEventListener('change', loadAuditLogs);
  $('auditDays').addEventListener('change', loadAuditLogs);
  $('auditRefresh').addEventListener('click', loadAuditLogs);
  $('auditExport').addEventListener('click', exportAuditLogs);

  loadAuditLogs();
}

async function loadAuditLogs() {
  try {
    const filters = {
      entityType: $('auditFilter').value || null,
      days: parseInt($('auditDays').value) || 30,
      limit: 200
    };

    const query = new URLSearchParams();
    if (filters.entityType) query.append('entityType', filters.entityType);
    query.append('limit', filters.limit);

    auditLogs = await api.get(`/audit?${query.toString()}`);
    renderAuditTable();
  } catch (err) {
    if (err.message.includes('403')) {
      toast('You do not have access to audit logs', true);
    } else {
      toast(err.message, true);
    }
  }
}

function renderAuditTable() {
  const tbody = $('auditTable').querySelector('tbody');

  if (!auditLogs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="hint">No audit logs found.</td></tr>';
    return;
  }

  tbody.innerHTML = auditLogs.map(log => {
    const time = new Date(log.created_at).toLocaleString();
    const actionColor = log.action === 'delete' ? 'var(--danger)' :
                       log.action === 'create' ? 'var(--success)' : 'var(--accent)';

    return `
      <tr>
        <td style="font-size:0.8rem; color:var(--text-faint);">${time}</td>
        <td style="font-size:0.85rem;">
          <strong>${esc(log.actor_role)}</strong><br>
          ${esc((log.actor_id || 'system').substring(0, 12))}
        </td>
        <td style="color:${actionColor}; font-weight:600; text-transform:uppercase; font-size:0.8rem;">
          ${esc(log.action)}
        </td>
        <td style="font-size:0.85rem;">
          ${esc(log.entity_type)}<br>
          <code style="font-size:0.72rem; color:var(--text-faint);">${esc(log.entity_id.substring(0, 16))}</code>
        </td>
        <td style="font-size:0.8rem; cursor:pointer;" data-audit-detail="${log.id}" title="Click for details">
          ${log.reason ? esc(log.reason.substring(0, 30)) + '...' : '—'}
        </td>
      </tr>
    `;
  }).join('');

  // Attach click handlers for detail view
  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('[data-audit-detail]');
    if (row) showAuditDetail(auditLogs.find(l => l.id === row.dataset.auditDetail));
  });
}

function showAuditDetail(log) {
  if (!log) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Audit Detail</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="calc-item">
          <div class="calc-label">Timestamp</div>
          <div style="font-size:0.9rem;">${new Date(log.created_at).toLocaleString()}</div>
        </div>

        <div class="calc-item">
          <div class="calc-label">Actor (Who)</div>
          <div style="font-size:0.9rem;">
            <strong>${esc(log.actor_role)}</strong> (${esc(log.actor_id.substring(0, 8))})
          </div>
        </div>

        <div class="calc-item">
          <div class="calc-label">Action</div>
          <div style="font-size:0.9rem; font-weight:600; text-transform:uppercase;">${esc(log.action)}</div>
        </div>

        <div class="calc-item">
          <div class="calc-label">Entity</div>
          <div style="font-size:0.9rem;">
            ${esc(log.entity_type)} / ${esc(log.entity_id.substring(0, 20))}
          </div>
        </div>

        ${log.reason ? `
          <div class="calc-item">
            <div class="calc-label">Reason</div>
            <div style="font-size:0.9rem;">${esc(log.reason)}</div>
          </div>
        ` : ''}

        ${log.before_state ? `
          <div class="calc-item">
            <div class="calc-label">Before State</div>
            <pre style="font-size:0.75rem; overflow-x:auto; background:var(--bg-inset); padding:0.5rem; border-radius:4px; max-height:150px;">
${JSON.stringify(log.before_state, null, 2).substring(0, 500)}</pre>
          </div>
        ` : ''}

        ${log.after_state ? `
          <div class="calc-item">
            <div class="calc-label">After State</div>
            <pre style="font-size:0.75rem; overflow-x:auto; background:var(--bg-inset); padding:0.5rem; border-radius:4px; max-height:150px;">
${JSON.stringify(log.after_state, null, 2).substring(0, 500)}</pre>
          </div>
        ` : ''}

        <div style="display:flex; gap:0.6rem; margin-top:1rem;">
          <button class="btn" id="closeDetailBtn">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.hidden = false;

  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('#closeDetailBtn').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('.modal-overlay').addEventListener('click', () => {
    modal.remove();
  });
}

async function exportAuditLogs() {
  try {
    const canExport = store.user?.role === 'super_admin' || store.user?.role === 'super_super_admin';
    if (!canExport) {
      return toast('You do not have permission to export audit logs', true);
    }

    const filters = {
      entityType: $('auditFilter').value || null
    };

    const query = new URLSearchParams();
    if (filters.entityType) query.append('entityType', filters.entityType);

    const logs = await api.get(`/audit/export?${query.toString()}`);
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast(`Exported ${logs.length} audit entries`);
  } catch (err) {
    toast(err.message, true);
  }
}
