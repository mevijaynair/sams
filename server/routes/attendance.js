// routes/attendance.js — session roster save + read + per-student summary.
import { Router } from 'express';
import * as Attendance from '../repos/attendance.js';

const router = Router();

// GET /api/attendance/dates  -> ["2026-06-14", ...]
router.get('/dates', (req, res) => {
  res.json(Attendance.sessionDates(req.tenantId));
});

// GET /api/attendance/summary/:studentId -> { totalPresent, totalSessions, streak }
router.get('/summary/:studentId', (req, res) => {
  res.json(Attendance.summary(req.tenantId, req.params.studentId));
});

// GET /api/attendance/:date -> [{ student_id, present }]
router.get('/:date', (req, res) => {
  res.json(Attendance.forDate(req.tenantId, req.params.date));
});

// POST /api/attendance/:date  body: { entries: [{ student_id, present }] }
router.post('/:date', (req, res) => {
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  const saved = Attendance.saveSession(req.tenantId, req.params.date, entries);
  res.json({ saved });
});

export default router;
