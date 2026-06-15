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

export default router;
