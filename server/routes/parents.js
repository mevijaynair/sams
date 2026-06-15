// parents.js — parent/guardian management API
import { Router } from 'express';
import { Parents } from '../repos/parents.js';
import { AuditLog } from '../repos/auditLog.js';
import { requireAuth, requirePerm, resolveTenant } from '../middleware.js';

const router = Router();

// Apply auth + tenant resolution to all routes
router.use(requireAuth);
router.use(resolveTenant);

// GET /api/parents — list all parents for this tenant
router.get('/', (req, res) => {
  const parents = Parents.list(req.tenantId);
  res.json(parents);
});

// POST /api/parents — create a new parent
router.post('/', requirePerm('students:write'), (req, res) => {
  const { name, email, phone, relationship } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Parent name is required' });
  }

  const parent = Parents.create(req.tenantId, { name, email, phone, relationship });

  // Audit log
  AuditLog.log(req, {
    tenantId: req.tenantId,
    entityType: 'parents',
    entityId: parent.id,
    action: 'create',
    afterState: parent,
    reason: req.body.reason || null
  });

  res.status(201).json(parent);
});

// GET /api/parents/:parentId — get parent with all their children
router.get('/:parentId', (req, res) => {
  const parent = Parents.getWithChildren(req.params.parentId);

  if (!parent) {
    return res.status(404).json({ error: 'Parent not found' });
  }

  res.json(parent);
});

// PUT /api/parents/:parentId — update parent info
router.put('/:parentId', requirePerm('students:write'), (req, res) => {
  const { name, email, phone, relationship } = req.body;
  const before = Parents.getById(req.params.parentId);

  if (!before) {
    return res.status(404).json({ error: 'Parent not found' });
  }

  const parent = Parents.update(req.params.parentId, { name, email, phone, relationship });

  AuditLog.log(req, {
    tenantId: req.tenantId,
    entityType: 'parents',
    entityId: req.params.parentId,
    action: 'update',
    beforeState: before,
    afterState: parent,
    reason: req.body.reason || null
  });

  res.json(parent);
});

// DELETE /api/parents/:parentId — delete parent and unlink from all students
router.delete('/:parentId', requirePerm('students:write'), (req, res) => {
  const parent = Parents.getById(req.params.parentId);

  if (!parent) {
    return res.status(404).json({ error: 'Parent not found' });
  }

  Parents.delete(req.params.parentId);

  AuditLog.log(req, {
    tenantId: req.tenantId,
    entityType: 'parents',
    entityId: req.params.parentId,
    action: 'delete',
    beforeState: parent,
    reason: req.body?.reason || null
  });

  res.json({ ok: true });
});

// POST /api/parents/:parentId/link-student — link a student to a parent
router.post('/:parentId/link-student', requirePerm('students:write'), (req, res) => {
  const { studentId, isPrimary = 0 } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  Parents.linkStudent(req.tenantId, studentId, req.params.parentId, isPrimary);

  AuditLog.log(req, {
    tenantId: req.tenantId,
    entityType: 'student_parents',
    entityId: `${studentId}-${req.params.parentId}`,
    action: 'link',
    afterState: { studentId, parentId: req.params.parentId, isPrimary },
    reason: req.body.reason || null
  });

  res.json({ ok: true });
});

// POST /api/parents/:parentId/unlink-student — unlink a student from a parent
router.post('/:parentId/unlink-student', requirePerm('students:write'), (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  Parents.unlinkStudent(studentId, req.params.parentId);

  AuditLog.log(req, {
    tenantId: req.tenantId,
    entityType: 'student_parents',
    entityId: `${studentId}-${req.params.parentId}`,
    action: 'unlink',
    beforeState: { studentId, parentId: req.params.parentId },
    reason: req.body.reason || null
  });

  res.json({ ok: true });
});

// POST /api/parents/:parentId/set-primary — set as primary contact for a student
router.post('/:parentId/set-primary', requirePerm('students:write'), (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  Parents.setPrimaryContact(studentId, req.params.parentId);

  AuditLog.log(req, {
    tenantId: req.tenantId,
    entityType: 'student_parents',
    entityId: `${studentId}-${req.params.parentId}`,
    action: 'set_primary',
    afterState: { studentId, parentId: req.params.parentId, isPrimary: 1 },
    reason: req.body.reason || null
  });

  res.json({ ok: true });
});

export default router;
