// modules/impersonate.js — Super-admin user impersonation for testing different roles
import { api } from '../api.js';
import { store } from '../store.js';
import { esc } from '../util.js';

let impersonating = null;

export function initImpersonate() {
  if (store.user?.role !== 'super_admin') return;  // Only super admin can impersonate

  const btn = document.createElement('button');
  btn.id = 'impersonateBtn';
  btn.className = 'icon-btn';
  btn.title = 'View as another user (Super Admin only)';
  btn.innerHTML = '👤';
  btn.style.marginRight = '0.75rem';

  btn.addEventListener('click', () => {
    showImpersonateModal();
  });

  // Add to topbar (after theme toggle)
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) {
    topbarRight.insertBefore(btn, topbarRight.firstChild);
  }

  // Check if already impersonating (from localStorage)
  const imp = localStorage.getItem('impersonating');
  if (imp) {
    try {
      impersonating = JSON.parse(imp);
      showImpersonationBanner();
    } catch (e) {
      localStorage.removeItem('impersonating');
    }
  }
}

async function showImpersonateModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content" style="min-width: 400px;">
      <div class="modal-header">
        <h3>View As Another User</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <div class="modal-body">
        <div id="userListContainer" style="max-height: 500px; overflow-y: auto;">
          <p style="color: var(--text-muted); text-align: center; padding: 2rem;">Loading users...</p>
        </div>
        ${impersonating ? `
          <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
            <button id="stopImpersonating" class="btn btn-secondary" style="width: 100%;">
              Stop Viewing As ${esc(impersonating.name)}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());

  // Stop impersonating button
  if (impersonating) {
    modal.querySelector('#stopImpersonating').addEventListener('click', async () => {
      await stopImpersonating();
      modal.remove();
      location.reload();
    });
  }

  // Load users
  try {
    const { users } = await api.get('/impersonate/users');
    const container = modal.querySelector('#userListContainer');

    if (users.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No users found</p>';
      return;
    }

    // Group by role
    const byRole = {};
    users.forEach(u => {
      const role = u.role || 'unknown';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(u);
    });

    const roleLabels = { super_admin: '🔐 Super Admin', admin: '📊 Admin', coach: '⚽ Coach', parent: '👨‍👩‍👧 Parent' };
    let html = '';

    Object.entries(byRole).forEach(([role, roleUsers]) => {
      html += `<div style="margin-bottom: 1rem;">
        <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem; font-weight: 600;">
          ${esc(roleLabels[role] || role)}
        </div>`;

      roleUsers.forEach(u => {
        const academy = u.tenantName ? `<div style="font-size: 0.75rem; color: var(--text-faint);">${esc(u.tenantName)}</div>` : '';
        const current = impersonating?.id === u.id ? ' style="background: var(--sport-soft); border-color: var(--sport-ring);"' : '';
        html += `
          <button class="user-item" data-user-id="${u.id}"${current}>
            <div style="font-weight: 500;">${esc(u.name)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${esc(u.email)}</div>
            ${academy}
          </button>`;
      });

      html += '</div>';
    });

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.user-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        await startImpersonating(userId);
        modal.remove();
        location.reload();
      });
    });
  } catch (e) {
    console.error('Failed to load users:', e);
    const container = modal.querySelector('#userListContainer');
    container.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 2rem;">Failed to load users: ${esc(e.message)}</p>`;
  }
}

async function startImpersonating(userId) {
  try {
    const res = await api.post(`/impersonate/start/${userId}`);
    const { accessToken, user } = res;

    store.setToken(accessToken);
    impersonating = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      originalAdmin: store.user.id  // Remember who we are
    };
    localStorage.setItem('impersonating', JSON.stringify(impersonating));

    // Re-bootstrap as the impersonated user
    store.user = user;
    showImpersonationBanner();
  } catch (e) {
    alert(`Failed to impersonate user: ${e.message}`);
  }
}

async function stopImpersonating() {
  try {
    const res = await api.post('/impersonate/stop');
    const { accessToken, user } = res;

    store.setToken(accessToken);
    store.user = user;
    impersonating = null;
    localStorage.removeItem('impersonating');
  } catch (e) {
    alert(`Failed to stop impersonating: ${e.message}`);
  }
}

function showImpersonationBanner() {
  // Remove old banner if exists
  const oldBanner = document.getElementById('impersonationBanner');
  if (oldBanner) oldBanner.remove();

  const banner = document.createElement('div');
  banner.id = 'impersonationBanner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--warning);
    color: white;
    padding: 0.75rem 1rem;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  `;

  banner.innerHTML = `
    👤 Viewing as <strong>${esc(impersonating.name)}</strong> (${impersonating.role})
    <button id="stopBannerBtn" style="margin-left: 1rem; padding: 0.4rem 0.8rem; background: rgba(0,0,0,0.2); border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: 500;">
      Stop Viewing
    </button>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
  banner.style.paddingTop = '1rem';  // Add space for banner

  banner.querySelector('#stopBannerBtn').addEventListener('click', async () => {
    await stopImpersonating();
    location.reload();
  });
}

export function isImpersonating() {
  return impersonating?.id;
}

export function getImpersonationInfo() {
  return impersonating;
}
