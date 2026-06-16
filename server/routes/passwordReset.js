// routes/passwordReset.js — forgot password, validate token, set new password.
import { Router } from 'express';
import * as Users from '../repos/users.js';
import * as PwReset from '../repos/passwordResets.js';
import { hashPassword } from '../auth.js';
import { sendPasswordReset, sendInvite, APP_URL } from '../email.js';

const router = Router();

// POST /forgot-password — send reset email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  const u = Users.findByEmail(email);
  if (!u) {
    // Don't reveal whether the email exists (prevent user enumeration)
    return res.json({ ok: true, message: 'If that email exists, a reset link has been sent' });
  }
  try {
    const token = PwReset.create(u.id, 'reset');
    const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordReset(u.email, u.name, url);
    res.json({ ok: true, message: 'Reset link sent' });
  } catch (e) {
    console.error('Email send failed:', e.message);
    res.status(500).json({ error: 'Failed to send email. Try again later.' });
  }
});

// POST /reset-password — validate token and set new password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  const valid = PwReset.validate(token);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid or expired reset token' });
  }
  try {
    const newHash = hashPassword(password);
    Users.setPassword(valid.userId, newHash);
    PwReset.use(token);
    res.json({ ok: true, message: 'Password updated. You can now log in.' });
  } catch (e) {
    console.error('Password reset failed:', e.message);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// POST /invite-accept — admin/super creates a user with an invite link; user sets password
router.post('/invite-accept', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  const valid = PwReset.validate(token);
  if (!valid || valid.purpose !== 'invite') {
    return res.status(401).json({ error: 'Invalid or expired invite' });
  }
  try {
    const newHash = hashPassword(password);
    Users.setPassword(valid.userId, newHash);
    PwReset.use(token);
    res.json({ ok: true, message: 'Account activated. You can now log in.' });
  } catch (e) {
    console.error('Invite accept failed:', e.message);
    res.status(500).json({ error: 'Failed to activate account' });
  }
});

export default router;
