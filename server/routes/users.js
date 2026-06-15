// routes/users.js — user administration (requires users:manage).
import { Router } from 'express';
import * as Users from '../repos/users.js';

const router = Router();

router.get('/', (req, res) => {
  // Super admin sees the selected tenant's staff; admin sees their own tenant.
  const list = req.user.role === 'super_admin'
    ? Users.listForTenant(req.tenantId)
    : Users.listForTenant(req.user.tenant_id);
  res.json(list);
});

router.post('/', (req, res) => {
  const { name, email, password, role, sport } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }
  // Admins may only create admin/coach in their own tenant; only super makes super_admins.
  if (req.user.role !== 'super_admin' && (role === 'super_admin')) {
    return res.status(403).json({ error: 'Only a super admin can create super admins' });
  }
  const tenant_id = req.user.role === 'super_admin'
    ? (role === 'super_admin' ? null : req.tenantId)
    : req.user.tenant_id;

  try {
    res.status(201).json(Users.create({ name, email, password, role, sport, tenant_id }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id/active', (req, res) => {
  res.json(Users.setActive(req.params.id, !!req.body.active));
});

export default router;
