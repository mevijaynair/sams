// routes/evaluations.js — pitch-performance evaluation logs per student.
import { Router } from 'express';
import * as Evals from '../repos/evaluations.js';

const router = Router();

// Latest evaluation per student for the whole tenant (Squad Matrix).
router.get('/', (req, res) => {
  res.json(Evals.latestForTenant(req.tenantId));
});

router.get('/:studentId', (req, res) => {
  res.json(Evals.listForStudent(req.tenantId, req.params.studentId));
});

router.post('/:studentId', (req, res) => {
  const saved = Evals.create(req.tenantId, req.params.studentId, req.body.metrics);
  if (!saved) return res.status(404).json({ error: 'Student not found for tenant' });
  res.status(201).json(saved);
});

export default router;
