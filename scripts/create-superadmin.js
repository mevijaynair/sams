// scripts/create-superadmin.js
// Provision (or reset) a SAMS super-admin account directly in the database.
//
// Safe to run on production. It uses the app's own scrypt hashing and the same
// DB the server uses (server/db.js resolves SAMS_DB_PATH or <app>/data/sams.db).
//
// Usage (run from the app root, e.g. /opt/fmss-platform/apps/sams):
//   SA_EMAIL="you@example.com" SA_PASSWORD="a-strong-password" node scripts/create-superadmin.js
//
// If it already exists, the password is reset and the account re-activated.
// If your systemd service sets SAMS_DB_PATH, export the same value before running.

import * as Users from '../server/repos/users.js';
import { hashPassword } from '../server/auth.js';

const email = (process.env.SA_EMAIL || '').trim().toLowerCase();
const password = process.env.SA_PASSWORD || '';
const name = process.env.SA_NAME || 'System Owner';

if (!email || !email.includes('@')) {
  console.error('ERROR: set SA_EMAIL to a valid email address.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('ERROR: set SA_PASSWORD to at least 8 characters.');
  process.exit(1);
}

const existing = Users.findByEmail(email);
if (existing) {
  Users.setPassword(existing.id, hashPassword(password));
  Users.setActive(existing.id, true);
  console.log(`✓ Reset password and activated existing user: ${email} (role: ${existing.role}, id: ${existing.id})`);
  if (existing.role !== 'super_admin') {
    console.log(`  NOTE: this account's role is "${existing.role}", not super_admin.`);
  }
} else {
  const u = Users.create({ email, name, password, role: 'super_admin', tenant_id: null, sport: null });
  console.log(`✓ Created super_admin: ${u.email} (id: ${u.id})`);
}
console.log('Done. You can now sign in at https://sams.fmss.ae');
