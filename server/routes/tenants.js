// routes/tenants.js — tenant listing + creation.
import { Router } from 'express';
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';
import { requirePerm } from '../middleware.js';

const router = Router();

// Any authenticated user can read the tenants they may operate on:
// super admins see all (for the tenant switcher); others see only their own.
router.get('/', (req, res) => {
  if (req.user.role === 'super_admin') {
    return res.json(db.prepare('SELECT id, name FROM tenants ORDER BY name').all());
  }
  const t = db.prepare('SELECT id, name FROM tenants WHERE id = ?').get(req.user.tenant_id);
  res.json(t ? [t] : []);
});

router.post('/', requirePerm('tenants:manage'), (req, res) => {
  const { name, id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const tid = id || ('ACAD_' + randomUUID().slice(0, 6).toUpperCase());
  try {
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tid, name);
    res.status(201).json({ id: tid, name });
  } catch (e) {
    res.status(400).json({ error: 'Could not create tenant (duplicate id?)' });
  }
});

export default router;
