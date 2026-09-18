// repos/fixtures.js — match fixtures + results. tenantId comes from middleware.
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

const COLS = `id, tenant_id, opponent, match_date, kickoff, venue, competition,
  age_group, sport, status, our_score, opp_score, notes, created_at`;

export function list(tenantId) {
  return db.prepare(
    `SELECT ${COLS} FROM fixtures WHERE tenant_id = ? ORDER BY match_date DESC, kickoff DESC`
  ).all(tenantId);
}

export function get(tenantId, id) {
  return db.prepare(`SELECT ${COLS} FROM fixtures WHERE tenant_id = ? AND id = ?`).get(tenantId, id);
}

// Next scheduled fixture (today or later); null if none.
export function next(tenantId, today) {
  return db.prepare(
    `SELECT ${COLS} FROM fixtures
     WHERE tenant_id = ? AND status = 'Scheduled' AND match_date >= ?
     ORDER BY match_date ASC, kickoff ASC LIMIT 1`
  ).get(tenantId, today) || null;
}

export function create(tenantId, f) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO fixtures
      (id, tenant_id, opponent, match_date, kickoff, venue, competition,
       age_group, sport, status, our_score, opp_score, notes, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, tenantId, f.opponent, f.match_date, f.kickoff || '',
    f.venue || 'Home', f.competition || 'Friendly', f.age_group || '',
    f.sport || 'Football', f.status || 'Scheduled',
    f.our_score ?? null, f.opp_score ?? null, f.notes || '', new Date().toISOString()
  );
  return get(tenantId, id);
}

export function update(tenantId, id, f) {
  const cur = get(tenantId, id);
  if (!cur) return null;
  const m = { ...cur, ...f };
  // If a score is present, mark the fixture Played (unless explicitly Cancelled).
  if ((f.our_score != null || f.opp_score != null) && m.status !== 'Cancelled') m.status = 'Played';
  db.prepare(`
    UPDATE fixtures SET opponent=?, match_date=?, kickoff=?, venue=?, competition=?,
      age_group=?, sport=?, status=?, our_score=?, opp_score=?, notes=?
    WHERE tenant_id=? AND id=?
  `).run(
    m.opponent, m.match_date, m.kickoff || '', m.venue, m.competition, m.age_group || '',
    m.sport, m.status, m.our_score ?? null, m.opp_score ?? null, m.notes || '',
    tenantId, id
  );
  return get(tenantId, id);
}

export function remove(tenantId, id) {
  const info = db.prepare('DELETE FROM fixtures WHERE tenant_id=? AND id=?').run(tenantId, id);
  return info.changes > 0;
}
