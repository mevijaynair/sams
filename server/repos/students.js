// repos/students.js — student persistence, always scoped by tenant_id
// (and optionally by sport for coaches).
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

const COLS = `id, tenant_id, name, sport, age_group, eid_number, eid_expiry,
  fee_plan_type, fee_rate, package_sessions, package_remaining,
  freeze_range, payment_status, last_payment_date, account_status, exit_reason, created_at`;

export function list(tenantId, sportScope = null) {
  if (sportScope) {
    return db.prepare(
      `SELECT ${COLS} FROM students WHERE tenant_id = ? AND sport = ? ORDER BY created_at DESC`
    ).all(tenantId, sportScope);
  }
  return db.prepare(
    `SELECT ${COLS} FROM students WHERE tenant_id = ? ORDER BY created_at DESC`
  ).all(tenantId);
}

export function get(tenantId, id) {
  return db.prepare(`SELECT ${COLS} FROM students WHERE tenant_id = ? AND id = ?`).get(tenantId, id);
}

export function create(tenantId, s) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO students
      (id, tenant_id, name, sport, age_group, eid_number, eid_expiry, fee_plan_type, fee_rate,
       package_sessions, package_remaining, freeze_range, payment_status, last_payment_date,
       account_status, exit_reason, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, tenantId, s.name, s.sport || 'Football', s.age_group,
    s.eid_number || '', s.eid_expiry || '',
    s.fee_plan_type || 'monthly', Number(s.fee_rate) || 0,
    Number(s.package_sessions) || 0, Number(s.package_remaining) || 0,
    s.freeze_range || '', s.payment_status || 'Due', s.last_payment_date || '',
    s.account_status || 'Active', s.exit_reason || '', new Date().toISOString()
  );
  return get(tenantId, id);
}

export function update(tenantId, id, s) {
  const existing = get(tenantId, id);
  if (!existing) return null;
  const m = { ...existing, ...s };
  db.prepare(`
    UPDATE students SET
      name=?, sport=?, age_group=?, eid_number=?, eid_expiry=?, fee_plan_type=?, fee_rate=?,
      package_sessions=?, package_remaining=?, freeze_range=?, payment_status=?,
      last_payment_date=?, account_status=?, exit_reason=?
    WHERE tenant_id=? AND id=?
  `).run(
    m.name, m.sport, m.age_group, m.eid_number, m.eid_expiry, m.fee_plan_type, Number(m.fee_rate) || 0,
    Number(m.package_sessions) || 0, Number(m.package_remaining) || 0, m.freeze_range, m.payment_status,
    m.last_payment_date, m.account_status, m.exit_reason, tenantId, id
  );
  return get(tenantId, id);
}

export function remove(tenantId, id) {
  const r = db.prepare('DELETE FROM students WHERE tenant_id=? AND id=?').run(tenantId, id);
  return r.changes > 0;
}

// Count attended sessions for a student (used by per-session billing).
export function attendedCount(tenantId, studentId) {
  return db.prepare(
    'SELECT COUNT(*) AS n FROM attendance WHERE tenant_id=? AND student_id=? AND present=1'
  ).get(tenantId, studentId).n;
}
