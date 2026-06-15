// repos/attendance.js — pitch-side attendance roster + streak analytics.
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

// Mark/overwrite one student's attendance for a session date (upsert).
export function mark(tenantId, studentId, sessionDate, present) {
  const owns = db.prepare(
    'SELECT 1 FROM students WHERE tenant_id=? AND id=?'
  ).get(tenantId, studentId);
  if (!owns) return null;

  db.prepare(`
    INSERT INTO attendance (id, tenant_id, student_id, session_date, present, recorded_at)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(student_id, session_date)
    DO UPDATE SET present=excluded.present, recorded_at=excluded.recorded_at
  `).run(randomUUID(), tenantId, studentId, sessionDate, present ? 1 : 0, new Date().toISOString());
  return true;
}

// Bulk save a whole session at once (coach taps then commits).
export function saveSession(tenantId, sessionDate, entries) {
  const tx = db.prepare('SELECT 1'); // placeholder to keep style; manual loop below
  let saved = 0;
  for (const e of entries) {
    if (mark(tenantId, e.student_id, sessionDate, e.present)) saved++;
  }
  return saved;
}

// Attendance for one session date, keyed by student_id.
export function forDate(tenantId, sessionDate) {
  return db.prepare(
    `SELECT student_id, present FROM attendance WHERE tenant_id=? AND session_date=?`
  ).all(tenantId, sessionDate);
}

// Per-student summary: total sessions present + current consecutive streak.
export function summary(tenantId, studentId) {
  const rows = db.prepare(
    `SELECT session_date, present FROM attendance
     WHERE tenant_id=? AND student_id=? ORDER BY session_date DESC`
  ).all(tenantId, studentId);

  const totalPresent = rows.filter(r => r.present).length;
  const totalSessions = rows.length;

  // Current streak = consecutive most-recent sessions marked present.
  let streak = 0;
  for (const r of rows) {
    if (r.present) streak++;
    else break;
  }
  return { totalPresent, totalSessions, streak };
}

// All distinct session dates for the tenant (for the date picker history).
export function sessionDates(tenantId) {
  return db.prepare(
    `SELECT DISTINCT session_date FROM attendance WHERE tenant_id=? ORDER BY session_date DESC`
  ).all(tenantId).map(r => r.session_date);
}
