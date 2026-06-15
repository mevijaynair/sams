// parents.js — parent/guardian management interface
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

let parentsList = [];
let currentParent = null;

export function initParents() {
  $('toggleParentForm').addEventListener('click', () => {
    resetParentForm();
    $('parentForm').hidden = !$('parentForm').hidden;
  });

  $('p_cancel').addEventListener('click', () => {
    resetParentForm();
    $('parentForm').hidden = true;
  });

  $('parentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('p_name').value.trim();
    const relationship = $('p_relationship').value;
    const email = $('p_email').value.trim();
    const phone = $('p_phone').value.trim();

    if (!name) return toast('Parent name is required', true);

    try {
      const id = $('parentId').value;
      if (id) {
        await api.put(`/parents/${id}`, { name, relationship, email, phone });
        toast('Parent updated');
      } else {
        await api.post('/parents', { name, relationship, email, phone });
        toast('Parent added');
      }
      resetParentForm();
      $('parentForm').hidden = true;
      await loadParents();
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('parentDetailClose').addEventListener('click', () => {
    $('parentDetailModal').hidden = true;
  });

  $('parentsTable').addEventListener('click', async (e) => {
    const viewBtn = e.target.closest('[data-view-parent]');
    const delBtn = e.target.closest('[data-del-parent]');

    if (viewBtn) await showParentDetail(viewBtn.dataset.viewParent);
    if (delBtn) await deleteParent(delBtn.dataset.delParent);
  });

  loadParents();
}

function resetParentForm() {
  $('parentForm').reset();
  $('parentId').value = '';
  $('p_submit').textContent = 'Save Parent';
}

async function loadParents() {
  try {
    parentsList = await api.get('/parents');
    renderParents();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderParents() {
  const tbody = $('parentsTable').querySelector('tbody');
  if (!parentsList.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="hint">No parents added yet.</td></tr>';
    return;
  }

  tbody.innerHTML = parentsList.map(p => `
    <tr>
      <td style="font-weight:500;">${esc(p.name)}</td>
      <td><span class="tag">${esc(p.relationship)}</span></td>
      <td style="font-size:0.82rem; color:var(--text-faint);">
        ${p.email ? `${esc(p.email)}<br>` : ''}${p.phone ? esc(p.phone) : '—'}
      </td>
      <td style="text-align:center; font-weight:600;">${p.child_count || 0}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" data-view-parent="${p.id}">View</button>
        <button class="btn btn-danger btn-sm" data-del-parent="${p.id}">✕</button>
      </td>
    </tr>
  `).join('');
}

async function showParentDetail(parentId) {
  try {
    const parent = await api.get(`/parents/${parentId}`);
    currentParent = parent;

    const title = $('parentDetailTitle');
    const body = $('parentDetailBody');

    title.textContent = parent.name;
    body.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <strong>${esc(parent.relationship)}</strong>
        ${parent.email ? `<div style="font-size:0.85rem; color:var(--text-faint);">${esc(parent.email)}</div>` : ''}
        ${parent.phone ? `<div style="font-size:0.85rem; color:var(--text-faint);">${esc(parent.phone)}</div>` : ''}
      </div>

      <div style="margin-bottom:1.5rem;">
        <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:0.5rem;">Children (${parent.children?.length || 0})</h4>
        ${parent.children?.length ? `
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${parent.children.map(child => `
              <div style="padding:0.6rem; background:var(--bg-inset); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <strong>${esc(child.name)}</strong>
                  <span style="font-size:0.75rem; color:var(--text-faint); margin-left:0.5rem;">${esc(child.age_group)}</span>
                  ${child.is_primary ? '<span style="color:var(--success); font-weight:600; margin-left:0.5rem;">★ Primary</span>' : ''}
                </div>
                <button class="btn btn-secondary btn-sm" data-set-primary="${child.id}">Set Primary</button>
              </div>
            `).join('')}
          </div>
        ` : '<p class="hint">No children linked yet.</p>'}
      </div>

      <div style="display:flex; gap:0.6rem;">
        <button class="btn" id="editParentBtn">Edit</button>
        <button class="btn btn-secondary" id="closeDetailBtn">Close</button>
      </div>
    `;

    $('parentDetailModal').hidden = false;

    $('editParentBtn').addEventListener('click', () => {
      $('parentDetailModal').hidden = true;
      editParent(parent);
    });

    $('closeDetailBtn').addEventListener('click', () => {
      $('parentDetailModal').hidden = true;
    });

    // Set primary contact
    body.addEventListener('click', async (e) => {
      const setPrimBtn = e.target.closest('[data-set-primary]');
      if (setPrimBtn) {
        const childId = setPrimBtn.dataset.setPrimary;
        try {
          await api.post(`/parents/${parentId}/set-primary`, { studentId: childId });
          await showParentDetail(parentId);  // Refresh
          toast('Primary contact updated');
        } catch (err) {
          toast(err.message, true);
        }
      }
    });
  } catch (err) {
    toast(err.message, true);
  }
}

function editParent(parent) {
  $('parentId').value = parent.id;
  $('p_name').value = parent.name;
  $('p_relationship').value = parent.relationship;
  $('p_email').value = parent.email || '';
  $('p_phone').value = parent.phone || '';
  $('p_submit').textContent = 'Update Parent';
  $('parentForm').hidden = false;
  $('parentForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteParent(parentId) {
  if (!confirm('Remove this parent? They will be unlinked from all children.')) return;

  try {
    await api.delete(`/parents/${parentId}`);
    toast('Parent removed');
    await loadParents();
  } catch (err) {
    toast(err.message, true);
  }
}
