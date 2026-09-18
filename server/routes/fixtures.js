// routes/fixtures.js — match fixtures + results. tenantId from middleware.
import { Router } from 'express';
import * as Fixtures from '../repos/fixtures.js';
import { Validators, validate } from '../validators.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(Fixtures.list(req.tenantId));
});

router.get('/:id', (req, res) => {
  const f = Fixtures.get(req.tenantId, req.params.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  res.json(f);
});

router.post('/', (req, res) => {
  const errors = validate(req.body || {}, {
    opponent: Validators.fixture.opponent,
    match_date: Validators.fixture.match_date,
    venue: Validators.fixture.venue,
  });
  if (errors) return res.status(400).json({ error: 'Validation failed', details: errors });
  res.status(201).json(Fixtures.create(req.tenantId, req.body));
});

router.put('/:id', (req, res) => {
  const schema = {};
  if (req.body.opponent !== undefined) schema.opponent = Validators.fixture.opponent;
  if (req.body.match_date !== undefined) schema.match_date = Validators.fixture.match_date;
  if (req.body.venue !== undefined) schema.venue = Validators.fixture.venue;
  if (req.body.status !== undefined) schema.status = Validators.fixture.status;
  if (req.body.our_score !== undefined) schema.our_score = Validators.fixture.our_score;
  if (req.body.opp_score !== undefined) schema.opp_score = Validators.fixture.opp_score;

  const errors = validate(req.body, schema);
  if (errors) return res.status(400).json({ error: 'Validation failed', details: errors });

  const updated = Fixtures.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = Fixtures.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

export default router;
