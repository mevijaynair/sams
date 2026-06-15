// auth.js — password hashing + JWT tokens, using only node:crypto.
//
// Passwords: scrypt with a per-password random salt, stored as "salt:hash".
// Sessions: JWT tokens (short-lived access + long-lived refresh in httpOnly cookie).
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 15;           // 15 minutes
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// In-memory set of revoked tokens (cleared on server restart; fine for dev)
const revoked = new Set();

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

// JWT signing (using HMAC-SHA256 only; no external libraries)
function signJWT(payload, expiresIn) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expiresIn / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

// JWT verification
export function verifyJWT(token) {
  if (revoked.has(token)) return null;
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expectedSig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // Expired
    return payload;
  } catch {
    return null;
  }
}

// Create access token (short-lived, in Authorization header)
export function createAccessToken(userId) {
  return signJWT({ sub: userId, type: 'access' }, ACCESS_TOKEN_TTL_MS);
}

// Create refresh token (long-lived, in httpOnly cookie)
export function createRefreshToken(userId) {
  return signJWT({ sub: userId, type: 'refresh' }, REFRESH_TOKEN_TTL_MS);
}

// Revoke a token (add to blacklist)
export function revokeToken(token) {
  revoked.add(token);
  // Optional: periodically clear expired tokens from the set
}

// Check if token is revoked
export function isTokenRevoked(token) {
  return revoked.has(token);
}

// Legacy token generation (kept for backwards compatibility during transition)
export function newToken() {
  return randomBytes(32).toString('hex');
}

export function sessionExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
}

export function isExpired(iso) {
  return new Date(iso).getTime() < Date.now();
}
