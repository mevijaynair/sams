// repos/tenants.js — academies and the sports each one runs.
import { db } from '../db.js';

function parse(row) {
  if (!row) return null;
  let sports = ['Football'];
  try { const a = JSON.parse(row.sports); if (Array.isArray(a) && a.length) sports = a; } catch { /* default */ }
  return { id: row.id, name: row.name, sports };
}

export function get(id) {
  return parse(db.prepare('SELECT id, name, sports FROM tenants WHERE id = ?').get(id));
}

export function sportsFor(id) {
  const t = get(id);
  return t ? t.sports : ['Football'];
}

export function list() {
  return db.prepare('SELECT id, name, sports FROM tenants ORDER BY name').all().map(parse);
}

export function create(id, name, sports) {
  const clean = Array.isArray(sports) && sports.length ? sports : ['Football'];
  db.prepare('INSERT INTO tenants (id, name, sports) VALUES (?, ?, ?)')
    .run(id, name, JSON.stringify(clean));
  return get(id);
}
