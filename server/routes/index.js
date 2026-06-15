// routes/index.js — mounts the API and enforces tenant scoping.
//
// Every /api request (except the tenant list) must name a tenant via the
// `X-Tenant-Id` header or `?tenant=` query param. The id is validated against
// the tenants table and exposed as req.tenantId for all repos — request bodies
// can never set their own tenant, which is what keeps tenants isolated.
import { Router } from 'express';
import { db } from '../db.js';
import students from './students.js';
import evaluations from './evaluations.js';
import attendance from './attendance.js';
import analytics from './analytics.js';
import exportRoutes from './export.js';

const router = Router();

// Public: list tenants so the UI can populate its selector.
router.get('/tenants', (_req, res) => {
  res.json(db.prepare('SELECT id, name FROM tenants ORDER BY name').all());
});

// Tenant middleware for everything below.
router.use((req, res, next) => {
  const tenantId = req.get('X-Tenant-Id') || req.query.tenant;
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenant (X-Tenant-Id header or ?tenant=)' });
  }
  const exists = db.prepare('SELECT 1 FROM tenants WHERE id = ?').get(tenantId);
  if (!exists) return res.status(404).json({ error: `Unknown tenant: ${tenantId}` });
  req.tenantId = tenantId;
  next();
});

router.use('/students', students);
router.use('/evaluations', evaluations);
router.use('/attendance', attendance);
router.use('/analytics', analytics);
router.use('/export', exportRoutes);

export default router;
