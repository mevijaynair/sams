// repos/evaluations.js — pitch-performance evaluation logs (one row per save).
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

export function listForStudent(tenantId, studentId) {
  return db.prepare(
    `SELECT id, student_id, recorded_at, metrics FROM evaluations
     WHERE tenant_id = ? AND student_id = ? ORDER BY recorded_at DESC`
  ).all(tenantId, studentId).map(parse);
}

export function latest(tenantId, studentId) {
  const row = db.prepare(
    `SELECT id, student_id, recorded_at, metrics FROM evaluations
     WHERE tenant_id = ? AND student_id = ? ORDER BY recorded_at DESC LIMIT 1`
  ).get(tenantId, studentId);
  return row ? parse(row) : null;
}

// Latest evaluation per student across the whole tenant (powers the matrix).
export function latestForTenant(tenantId) {
  return db.prepare(
    `SELECT e.id, e.student_id, e.recorded_at, e.metrics FROM evaluations e
     WHERE e.tenant_id = ?
       AND e.recorded_at = (
         SELECT MAX(recorded_at) FROM evaluations
         WHERE tenant_id = e.tenant_id AND student_id = e.student_id)`
  ).all(tenantId).map(parse);
}

export function create(tenantId, studentId, metrics) {
  // Guard: the student must belong to this tenant.
  const owns = db.prepare(
    'SELECT 1 FROM students WHERE tenant_id=? AND id=?'
  ).get(tenantId, studentId);
  if (!owns) return null;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO evaluations (id, tenant_id, student_id, recorded_at, metrics)
     VALUES (?,?,?,?,?)`
  ).run(id, tenantId, studentId, new Date().toISOString(), JSON.stringify(metrics || {}));
  return latest(tenantId, studentId);
}

function parse(row) {
  let metrics = {};
  try { metrics = JSON.parse(row.metrics); } catch { /* keep {} */ }
  return { ...row, metrics };
}
