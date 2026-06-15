// middleware.js — auth, tenant resolution, and permission gates.
import * as Users from './repos/users.js';
import * as Tenants from './repos/tenants.js';
import { db } from './db.js';
import { permsFor, can } from './permissions.js';
import { verifyJWT } from './auth.js';

// Attaches req.user (with .permissions) or 401s.
export function requireAuth(req, res, next) {
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Verify JWT token
  const payload = verifyJWT(token);
  if (!payload || payload.type !== 'access') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const u = Users.findById(payload.sub);
  if (!u || !u.active) {
    return res.status(401).json({ error: 'User not found or inactive' });
  }

  req.user = {
    id: u.id, name: u.name, email: u.email, role: u.role,
    tenant_id: u.tenant_id, sport: u.sport, permissions: permsFor(u.role)
  };
  next();
}

// Resolves the tenant the request operates on:
//  - super_admin: from X-Tenant-Id header / ?tenant= (they choose)
//  - admin/coach: locked to their own tenant
// Sets req.tenantId, or 400 if a super_admin didn't name a valid tenant.
export function resolveTenant(req, res, next) {
  if (req.user.role === 'super_admin') {
    const t = req.get('X-Tenant-Id') || req.query.tenant;
    if (!t) return res.status(400).json({ error: 'Super admin must select a tenant (X-Tenant-Id)' });
    const ok = db.prepare('SELECT 1 FROM tenants WHERE id = ?').get(t);
    if (!ok) return res.status(404).json({ error: `Unknown tenant: ${t}` });
    req.tenantId = t;
  } else {
    req.tenantId = req.user.tenant_id;
  }
  // Sports the active academy runs (drives single- vs multi-sport UI + validation).
  req.tenantSports = Tenants.sportsFor(req.tenantId);
  // Coaches are scoped to their sport for student-facing reads.
  req.sportScope = req.user.role === 'coach' ? req.user.sport : null;
  next();
}

export function requirePerm(perm) {
  return (req, res, next) => {
    if (!can(req.user.role, perm)) {
      return res.status(403).json({ error: `Forbidden: requires ${perm}` });
    }
    next();
  };
}
