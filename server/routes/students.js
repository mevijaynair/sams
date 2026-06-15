// routes/students.js — CRUD for students. tenantId comes from req.tenantId
// (set by the tenant middleware), never from the request body.
import { Router } from 'express';
import * as Students from '../repos/students.js';
import { Validators, validate } from '../validators.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const students = Students.list(req.tenantId, req.sportScope);
  res.json({
    total: students.length,
    limit,
    offset,
    students: students.slice(offset, offset + limit)
  });
});

router.get('/:id', (req, res) => {
  const s = Students.get(req.tenantId, req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

// A student's sport must be one the academy actually runs; coerce to the only
// sport for single-sport academies, default to the first otherwise.
function coerceSport(req) {
  const allowed = req.tenantSports || [];
  if (req.body.sport && allowed.includes(req.body.sport)) return;
  req.body.sport = allowed[0] || 'Football';
}

router.post('/', (req, res) => {
  // Validate required fields
  const errors = validate(req.body || {}, {
    name: Validators.student.name,
    age_group: Validators.student.age_group,
  });
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  coerceSport(req);
  res.status(201).json(Students.create(req.tenantId, req.body));
});

router.put('/:id', (req, res) => {
  // Validate optional fields if present
  const schema = {};
  if (req.body.name !== undefined) schema.name = Validators.student.name;
  if (req.body.age_group !== undefined) schema.age_group = Validators.student.age_group;
  if (req.body.fee_plan_type !== undefined) schema.fee_plan_type = Validators.student.fee_plan_type;
  if (req.body.fee_rate !== undefined) schema.fee_rate = Validators.student.fee_rate;

  const errors = validate(req.body, schema);
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  if (req.body.sport !== undefined) coerceSport(req);
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
