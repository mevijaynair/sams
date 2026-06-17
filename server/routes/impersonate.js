// routes/impersonate.js — Super-admin user impersonation for testing different roles
import { Router } from 'express';
import * as Users from '../repos/users.js';
import { requireAuth } from '../middleware.js';

const router = Router();

// Super-admin only: list all users for impersonation picker
router.get('/users', requireAuth, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can impersonate users' });
  }

  // Get all users, sorted by role, then name
  const users = Users.all();
  const sorted = users
    .filter(u => u.active)  // Only show active users
    .sort((a, b) => {
      const roleOrder = { super_admin: 0, admin: 1, coach: 2, parent: 3 };
      const aOrder = roleOrder[a.role] ?? 999;
      const bOrder = roleOrder[b.role] ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.name || '').localeCompare(b.name || '');
    })
    .map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      tenant_id: u.tenant_id,
      tenantName: u.tenantName || null
    }));

  res.json({ users });
});

// Super-admin only: set impersonation context
// Returns a new access token for the impersonated user
router.post('/start/:userId', requireAuth, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can impersonate users' });
  }

  const targetUser = Users.findById(req.params.userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!targetUser.active) {
    return res.status(400).json({ error: 'Cannot impersonate inactive user' });
  }

  // Import inside function to avoid circular dependency
  const { createAccessToken } = await import('../auth.js');

  // Create special token marked as impersonation (includes original user ID)
  const accessToken = createAccessToken(targetUser.id);

  // Set header indicating this is impersonation
  res.setHeader('X-Impersonated-By', req.user.id);

  res.json({
    accessToken,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      tenant_id: targetUser.tenant_id,
      impersonatedBy: req.user.id  // Tell frontend we're impersonating
    }
  });
});

// Super-admin only: end impersonation, return to original user
router.post('/stop', requireAuth, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can stop impersonation' });
  }

  const { createAccessToken } = await import('../auth.js');
  const originalUser = Users.findById(req.user.id);

  if (!originalUser) {
    return res.status(404).json({ error: 'Original user not found' });
  }

  const accessToken = createAccessToken(originalUser.id);

  res.json({
    accessToken,
    user: {
      id: originalUser.id,
      name: originalUser.name,
      email: originalUser.email,
      role: originalUser.role,
      tenant_id: originalUser.tenant_id
    }
  });
});

export default router;
