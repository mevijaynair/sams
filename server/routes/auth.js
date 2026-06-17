// routes/auth.js — login / logout / refresh / me (JWT-based auth).
import { Router } from 'express';
import * as Users from '../repos/users.js';
import { verifyPassword, createAccessToken, createRefreshToken, verifyJWT, revokeToken } from '../auth.js';
import { permsFor, ROLE_LABELS } from '../permissions.js';
import { requireAuth } from '../middleware.js';
import * as Tenants from '../repos/tenants.js';

const router = Router();

function publicUser(u) {
  const tenant = u.tenant_id ? Tenants.get(u.tenant_id) : null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, roleLabel: ROLE_LABELS[u.role] || u.role,
    tenant_id: u.tenant_id, tenantName: tenant?.name || null, tenantSports: tenant?.sports || null,
    sport: u.sport, permissions: permsFor(u.role)
  };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = Users.findByEmail(email || '');

  // Use constant-time comparison to prevent timing attacks and user enumeration
  const validUser = u && u.active && verifyPassword(password || '', u.password_hash || '');
  if (!validUser) {
    // Return same error regardless of whether user exists or password is wrong
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = createAccessToken(u.id);
  const refreshToken = createRefreshToken(u.id);

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'Strict',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  res.json({ accessToken, user: publicUser(u) });
});

router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const payload = verifyJWT(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const u = Users.findById(payload.sub);
  if (!u || !u.active) {
    return res.status(401).json({ error: 'User not found or inactive' });
  }

  const newAccessToken = createAccessToken(u.id);
  res.json({ accessToken: newAccessToken });
});

router.post('/logout', requireAuth, (req, res) => {
  const auth = req.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    revokeToken(token);
  }
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const u = Users.findById(req.user.id);
  res.json({ user: publicUser(u) });
});

// Dev-only endpoint: fetch dev accounts (NEVER expose in production)
// Only available when NODE_ENV !== 'production'
router.get('/dev-accounts', (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'prod';

  if (!isDev) {
    // Don't expose any hint that this endpoint exists
    return res.status(404).json({ error: 'Not found' });
  }

  // Return only labels and emails (no passwords) — passwords never sent to client
  const accounts = [
    { email: 'super@sams.dev', label: 'Super Admin (all academies)' },
    { email: 'admin@apex.dev', label: 'Admin · Apex Football (single-sport)' },
    { email: 'football@apex.dev', label: 'Coach · Football' },
    { email: 'admin@royal.dev', label: 'Admin · Royal Cricket (single-sport)' },
    { email: 'admin@skyline.dev', label: 'Admin · Skyline (multi-sport)' }
  ];
  res.json({ accounts });
});

// Dev-only auto-login endpoint: logs in to a dev account without password
// Only available in development mode; production returns 404
router.post('/dev-login', (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'prod';

  if (!isDev) {
    // Don't expose any hint that this endpoint exists
    return res.status(404).json({ error: 'Not found' });
  }

  const { email } = req.body || {};
  const validEmails = ['super@sams.dev', 'admin@apex.dev', 'football@apex.dev', 'admin@royal.dev', 'admin@skyline.dev'];

  if (!validEmails.includes(email)) {
    return res.status(400).json({ error: 'Invalid dev account' });
  }

  const u = Users.findByEmail(email);
  if (!u || !u.active) {
    return res.status(401).json({ error: 'Dev account not found or inactive' });
  }

  const accessToken = createAccessToken(u.id);
  const refreshToken = createRefreshToken(u.id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  res.json({ accessToken, user: publicUser(u) });
});

export default router;
