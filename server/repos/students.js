// repos/students.js — all student persistence, always scoped by tenant_id.
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

const COLS = `id, tenant_id, name, age_group, eid_number, eid_expiry,
  billing_structure, monthly_fee, discount_note, freeze_range,
  payment_status, last_payment_date, account_status, exit_reason, created_at`;

export function list(tenantId) {
  return db.prepare(
    `SELECT ${COLS} FROM students WHERE tenant_id = ? ORDER BY created_at DESC`
  ).all(tenantId);
}

export function get(tenantId, id) {
  return db.prepare(
    `SELECT ${COLS} FROM students WHERE tenant_id = ? AND id = ?`
  ).get(tenantId, id);
}

export function create(tenantId, s) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO students
      (id, tenant_id, name, age_group, eid_number, eid_expiry, billing_structure,
       monthly_fee, discount_note, freeze_range, payment_status, last_payment_date,
       account_status, exit_reason, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, tenantId, s.name, s.age_group, s.eid_number || '', s.eid_expiry || '',
    s.billing_structure || 'Standard', Number(s.monthly_fee) || 0,
    s.discount_note || '', s.freeze_range || '', s.payment_status || 'Due',
    s.last_payment_date || '', s.account_status || 'Active', s.exit_reason || '',
    new Date().toISOString()
  );
  return get(tenantId, id);
}

export function update(tenantId, id, s) {
  const existing = get(tenantId, id);
  if (!existing) return null;
  const m = { ...existing, ...s };
  db.prepare(`
    UPDATE students SET
      name=?, age_group=?, eid_number=?, eid_expiry=?, billing_structure=?,
      monthly_fee=?, discount_note=?, freeze_range=?, payment_status=?,
      last_payment_date=?, account_status=?, exit_reason=?
    WHERE tenant_id=? AND id=?
  `).run(
    m.name, m.age_group, m.eid_number, m.eid_expiry, m.billing_structure,
    Number(m.monthly_fee) || 0, m.discount_note, m.freeze_range, m.payment_status,
    m.last_payment_date, m.account_status, m.exit_reason, tenantId, id
  );
  return get(tenantId, id);
}

export function remove(tenantId, id) {
  const r = db.prepare('DELETE FROM students WHERE tenant_id=? AND id=?').run(tenantId, id);
  return r.changes > 0;
}
