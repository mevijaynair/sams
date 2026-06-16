// repos/users.js — user accounts + auth sessions.
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';
import { hashPassword, newToken, sessionExpiry, isExpired } from '../auth.js';

const SAFE = 'id, tenant_id, name, email, role, sport, active, created_at';

export function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
}

export function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// --- sessions ---
export function createSession(userId) {
  const token = newToken();
  db.prepare(
    'INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)'
  ).run(token, userId, new Date().toISOString(), sessionExpiry());
  return token;
}

export function userForToken(token) {
  if (!token) return null;
  const s = db.prepare('SELECT user_id, expires_at FROM auth_sessions WHERE token = ?').get(token);
  if (!s) return null;
  if (isExpired(s.expires_at)) { deleteSession(token); return null; }
  const u = findById(s.user_id);
  if (!u || !u.active) return null;
  return u;
}

export function deleteSession(token) {
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}

// --- management (admin/super) ---
export function listForTenant(tenantId) {
  return db.prepare(`SELECT ${SAFE} FROM users WHERE tenant_id = ? ORDER BY role, name`).all(tenantId);
}

export function listAll() {
  return db.prepare(`SELECT ${SAFE} FROM users ORDER BY tenant_id, role, name`).all();
}

export function create(u) {
  if (findByEmail(u.email)) throw new Error('Email already in use');
  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role, sport, active, created_at)
    VALUES (?,?,?,?,?,?,?,1,?)
  `).run(id, u.tenant_id || null, u.name, String(u.email).toLowerCase().trim(),
    hashPassword(u.password), u.role, u.sport || null, new Date().toISOString());
  return db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(id);
}

export function setActive(id, active) {
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(id);
}

export function setPassword(id, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}
