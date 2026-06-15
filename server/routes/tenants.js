// routes/tenants.js — tenant listing + creation (with the sports they run).
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import * as Tenants from '../repos/tenants.js';
import { requirePerm } from '../middleware.js';

const router = Router();

// Super admins see all (for the tenant switcher); others see only their own.
router.get('/', (req, res) => {
  if (req.user.role === 'super_admin') return res.json(Tenants.list());
  const t = Tenants.get(req.user.tenant_id);
  res.json(t ? [t] : []);
});

router.post('/', requirePerm('tenants:manage'), (req, res) => {
  const { name, id, sports } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const list = Array.isArray(sports) ? sports.filter(Boolean) : [];
  if (!list.length) return res.status(400).json({ error: 'select at least one sport' });
  const tid = id || ('ACAD_' + randomUUID().slice(0, 6).toUpperCase());
  try {
    res.status(201).json(Tenants.create(tid, name, list));
  } catch {
    res.status(400).json({ error: 'Could not create academy (duplicate id?)' });
  }
});

export default router;
