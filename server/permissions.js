// permissions.js — the single source of truth for RBAC.
//
// Permissions are coarse "domain:action" strings checked in routes. The client
// also receives its permission list (via /api/auth/me) to show/hide nav — but
// the server check is what actually enforces access.

export const PERMISSIONS = [
  'students:read', 'students:write',
  'attendance:read', 'attendance:write',
  'performance:read', 'performance:write',
  'billing:read', 'billing:write',
  'comms:read', 'comms:write',
  'analytics:read',
  'users:manage',     // create/edit users within a tenant
  'tenants:manage'    // create tenants, act across tenants (super only)
];

const ROLE_PERMS = {
  super_admin: new Set(PERMISSIONS), // everything

  admin: new Set([
    'students:read', 'students:write',
    'attendance:read', 'attendance:write',
    'performance:read', 'performance:write',
    'billing:read', 'billing:write',
    'comms:read', 'comms:write',
    'analytics:read',
    'users:manage'
  ]),

  coach: new Set([
    'students:read',
    'attendance:read', 'attendance:write',
    'performance:read', 'performance:write',
    'analytics:read'
  ])
};

export function permsFor(role) {
  return [...(ROLE_PERMS[role] || [])];
}

export function can(role, perm) {
  return !!(ROLE_PERMS[role] && ROLE_PERMS[role].has(perm));
}

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Academy Admin',
  coach: 'Coach'
};
