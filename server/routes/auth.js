// routes/auth.js — login / logout / me.
import { Router } from 'express';
import * as Users from '../repos/users.js';
import { verifyPassword } from '../auth.js';
import { permsFor, ROLE_LABELS } from '../permissions.js';
import { requireAuth } from '../middleware.js';
import { db } from '../db.js';

const router = Router();

function publicUser(u) {
  let tenantName = null;
  if (u.tenant_id) {
    const t = db.prepare('SELECT name FROM tenants WHERE id = ?').get(u.tenant_id);
    tenantName = t?.name || null;
  }
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, roleLabel: ROLE_LABELS[u.role] || u.role,
    tenant_id: u.tenant_id, tenantName, sport: u.sport, permissions: permsFor(u.role)
  };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = Users.findByEmail(email || '');
  if (!u || !u.active || !verifyPassword(password || '', u.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = Users.createSession(u.id);
  res.json({ token, user: publicUser(u) });
});

router.post('/logout', requireAuth, (req, res) => {
  const auth = req.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) Users.deleteSession(auth.slice(7));
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const u = Users.findById(req.user.id);
  res.json({ user: publicUser(u) });
});

export default router;
