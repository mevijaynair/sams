// routes/index.js — mounts the API. Auth + tenant + permission gating live here.
import { Router } from 'express';
import auth from './auth.js';
import students from './students.js';
import evaluations from './evaluations.js';
import attendance from './attendance.js';
import analytics from './analytics.js';
import billing from './billing.js';
import users from './users.js';
import tenants from './tenants.js';
import exportRoutes from './export.js';
import { requireAuth, resolveTenant, requirePerm } from '../middleware.js';

const router = Router();

// --- public ---
router.use('/auth', auth);

// --- authenticated, but NOT tenant-resolved (the tenant chooser lives here) ---
router.use(requireAuth);
router.use('/tenants', tenants);                                  // own gating inside

// --- everything below additionally needs a resolved tenant ---
router.use(resolveTenant);

// Method-aware gate: GET needs the read perm, writes need the write perm.
function gate(readPerm, writePerm) {
  return (req, res, next) =>
    requirePerm(req.method === 'GET' ? readPerm : writePerm)(req, res, next);
}

router.use('/students', gate('students:read', 'students:write'), students);
router.use('/evaluations', gate('performance:read', 'performance:write'), evaluations);
router.use('/attendance', gate('attendance:read', 'attendance:write'), attendance);
router.use('/analytics', requirePerm('analytics:read'), analytics);
router.use('/billing', requirePerm('billing:read'), billing);
router.use('/export', requirePerm('students:read'), exportRoutes);
router.use('/users', requirePerm('users:manage'), users);

export default router;
