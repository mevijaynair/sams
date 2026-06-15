// routes/students.js — CRUD for students. tenantId comes from req.tenantId
// (set by the tenant middleware), never from the request body.
import { Router } from 'express';
import * as Students from '../repos/students.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(Students.list(req.tenantId));
});

router.get('/:id', (req, res) => {
  const s = Students.get(req.tenantId, req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

router.post('/', (req, res) => {
  if (!req.body.name || !req.body.age_group) {
    return res.status(400).json({ error: 'name and age_group are required' });
  }
  res.status(201).json(Students.create(req.tenantId, req.body));
});

router.put('/:id', (req, res) => {
  const updated = Students.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = Students.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

export default router;
