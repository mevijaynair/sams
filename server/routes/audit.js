// audit.js — audit log viewer for super_admin and admins (role-based access)
import { Router } from 'express';
import { AuditLog } from '../repos/auditLog.js';
import { requireAuth, resolveTenant } from '../middleware.js';

const router = Router();

router.use(requireAuth);
router.use(resolveTenant);

// GET /api/audit — list audit logs (super_admin sees all tenants, admin sees only their tenant)
router.get('/', (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'super_super_admin';

  if (!isSuperAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Audit log access denied' });
  }

  const filters = {
    tenantId: isSuperAdmin ? req.query.tenantId || null : req.tenantId,
    actorId: req.query.actorId || null,
    entityType: req.query.entityType || null,
    limit: Math.min(parseInt(req.query.limit) || 100, 1000),
    offset: parseInt(req.query.offset) || 0
  };

  const logs = AuditLog.list(filters);
  res.json(logs);
});

// GET /api/audit/summary — audit activity summary for dashboard
router.get('/summary', (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'super_super_admin';

  if (!isSuperAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Audit summary access denied' });
  }

  const daysBack = Math.min(parseInt(req.query.days) || 30, 365);
  const summary = AuditLog.getSummary(isSuperAdmin ? req.query.tenantId || null : req.tenantId, daysBack);

  res.json({ daysBack, summary });
});

// GET /api/audit/entity/:type/:id — history of all changes to a specific entity
router.get('/entity/:type/:id', (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'super_super_admin';

  if (!isSuperAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Audit history access denied' });
  }

  const history = AuditLog.getEntityHistory(req.params.type, req.params.id);
  res.json(history);
});

// GET /api/audit/actor/:actorId — all actions by a specific user
router.get('/actor/:actorId', (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'super_super_admin';

  if (!isSuperAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Audit access denied' });
  }

  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  const logs = AuditLog.getActorLogs(req.params.actorId, limit);
  res.json(logs);
});

// GET /api/audit/export — export audit logs (super_admin only)
router.get('/export', (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'super_super_admin') {
    return res.status(403).json({ error: 'Audit export denied' });
  }

  const filters = {
    tenantId: req.query.tenantId || null,
    entityType: req.query.entityType || null,
    limit: 10000
  };

  const logs = AuditLog.export(filters);

  // Send as JSON download
  res.setHeader('Content-Disposition', `attachment; filename=audit-${new Date().toISOString()}.json`);
  res.json(logs);
});

export default router;
