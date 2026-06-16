// repos/passwordResets.js — password reset / invite token management.
// Tokens are stored hashed (SHA-256) so a DB leak doesn't expose active tokens.
import { db } from '../db.js';
import { randomBytes, createHash } from 'node:crypto';

const TOKEN_LENGTH = 32;        // 32 bytes = 256 bits
const EXPIRY_HOURS = 1;         // tokens valid for 1 hour

function hash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function expiresAt() {
  const d = new Date();
  d.setHours(d.getHours() + EXPIRY_HOURS);
  return d.toISOString();
}

export function create(userId, purpose = 'reset') {
  const token = randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenHash = hash(token);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO password_resets (token_hash, user_id, purpose, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(tokenHash, userId, purpose, expiresAt(), now);
  return token;  // return raw token to email; never store it
}

export function validate(token) {
  const tokenHash = hash(token);
  const row = db.prepare(
    `SELECT token_hash, user_id, purpose, expires_at, used_at FROM password_resets
     WHERE token_hash = ?`
  ).get(tokenHash);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;  // expired
  if (row.used_at) return null;                             // already used
  return { userId: row.user_id, purpose: row.purpose };
}

export function use(token) {
  const tokenHash = hash(token);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE password_resets SET used_at = ? WHERE token_hash = ?`
  ).run(now, tokenHash);
}

export function deleteForUser(userId) {
  db.prepare(`DELETE FROM password_resets WHERE user_id = ?`).run(userId);
}
