// auth.js — password hashing + token sessions, using only node:crypto.
//
// Passwords: scrypt with a per-password random salt, stored as "salt:hash".
// Sessions: a random opaque token row in auth_sessions (Bearer token from the
// client). This is deliberately simple and dev-friendly; for production swap to
// signed cookies / JWT and shorter TTLs (see README).
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = scryptSync(plain, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return test.length === ref.length && timingSafeEqual(test, ref);
}

export function newToken() {
  return randomBytes(32).toString('hex');
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export function isExpired(iso) {
  return new Date(iso).getTime() < Date.now();
}
