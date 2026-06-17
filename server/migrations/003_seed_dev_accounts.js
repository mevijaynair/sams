// 003_seed_dev_accounts.js — Seed dev accounts and demo tenants/students
// This migration runs on every environment (dev AND production) to ensure dev accounts exist.
// The dev endpoints (/dev-accounts, /dev-login) are only exposed in development mode anyway.

import { hashPassword } from '../auth.js';

export async function up(db) {
  const now = new Date().toISOString();

  // Check if already seeded (by looking for the super admin)
  const existing = db.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').get('super@sams.dev');
  if (existing.n > 0) {
    console.log('Dev accounts already exist, skipping seed.');
    return;
  }

  // Create 3 demo academies (tenants)
  const insTenant = db.prepare('INSERT INTO tenants (id, name, sports) VALUES (?, ?, ?)');
  insTenant.run('ACAD_01', 'Apex Football Academy', JSON.stringify(['Football']));
  insTenant.run('ACAD_02', 'Royal Cricket Academy', JSON.stringify(['Cricket']));
  insTenant.run('ACAD_03', 'Skyline Sports Club', JSON.stringify(['Football', 'Basketball', 'Badminton']));

  // Create dev users with hashed passwords
  const insUser = db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role, sport, active, created_at)
    VALUES (?,?,?,?,?,?,?,1,?)
  `);

  const createUser = (id, tenant, name, email, password, role, sport) => {
    const hash = hashPassword(password);
    insUser.run(id, tenant, name, email, hash, role, sport, now);
  };

  // Dev accounts (same as in seed.js)
  createUser('u_super', null, 'System Owner', 'super@sams.dev', 'super123', 'super_admin', null);
  createUser('u_admin1', 'ACAD_01', 'Apex Admin', 'admin@apex.dev', 'admin123', 'admin', null);
  createUser('u_coach_fb', 'ACAD_01', 'Coach Diego', 'football@apex.dev', 'coach123', 'coach', 'Football');
  createUser('u_admin2', 'ACAD_02', 'Royal Admin', 'admin@royal.dev', 'admin123', 'admin', null);
  createUser('u_coach_ck', 'ACAD_02', 'Coach Imran', 'cricket@royal.dev', 'coach123', 'coach', 'Cricket');
  createUser('u_admin3', 'ACAD_03', 'Skyline Admin', 'admin@skyline.dev', 'admin123', 'admin', null);
  createUser('u_coach_bb', 'ACAD_03', 'Coach Marcus', 'basketball@skyline.dev', 'coach123', 'coach', 'Basketball');

  // Create sample students for each academy
  const insStudent = db.prepare(`
    INSERT INTO students
      (id, tenant_id, name, sport, age_group, eid_number, eid_expiry, fee_plan_type, fee_rate,
       package_sessions, package_remaining, freeze_range, payment_status, last_payment_date,
       account_status, exit_reason, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  // Apex Football Academy
  insStudent.run('s1', 'ACAD_01', 'Zayd Nair', 'Football', 'U10-U13', '784-1980-1234567-1',
    '2027-12-31', 'monthly', 450, 0, 0, '', 'Paid', '2026-06-01', 'Active', '', now);
  insStudent.run('s2', 'ACAD_01', 'Ryan Al-Mansoori', 'Football', 'U14-U18', '784-2008-7654321-2',
    '2026-05-15', 'per_session', 60, 0, 0, 'July-August', 'Due', '2026-04-01', 'Active', '', now);
  insStudent.run('s3', 'ACAD_01', 'Sami Okafor', 'Football', 'U6-U9', '784-2016-9990001-6',
    '2028-02-01', 'monthly', 400, 0, 0, '', 'Paid', '2026-06-02', 'Active', '', now);

  // Royal Cricket Academy
  insStudent.run('s4', 'ACAD_02', 'Aarav Sharma', 'Cricket', 'U10-U13', '784-2014-2223334-4',
    '2028-03-10', 'package', 800, 16, 11, '', 'Paid', '2026-05-20', 'Active', '', now);
  insStudent.run('s5', 'ACAD_02', 'Yusuf Khan', 'Cricket', 'U14-U18', '784-2009-4445556-7',
    '2026-07-01', 'monthly', 500, 0, 0, '', 'Overdue', '2026-03-15', 'Active', '', now);

  // Skyline Sports Club
  insStudent.run('s6', 'ACAD_03', 'Leah Court', 'Basketball', 'U14-U18', '784-2010-5556667-5',
    '2026-08-01', 'monthly', 400, 0, 0, '', 'Due', '2026-04-15', 'Active', '', now);
  insStudent.run('s7', 'ACAD_03', 'Omar Haddad', 'Badminton', 'U6-U9', '784-2018-1112223-3',
    '2028-01-20', 'package', 500, 10, 3, '', 'Due', '2026-04-10', 'Active', '', now);
  insStudent.run('s8', 'ACAD_03', 'Diego Reyes', 'Football', 'U10-U13', '784-2015-7778889-8',
    '2027-11-11', 'monthly', 450, 0, 0, '', 'Paid', '2026-06-01', 'Active', '', now);

  // Create a sample evaluation
  const insEval = db.prepare(`
    INSERT INTO evaluations (id, tenant_id, student_id, recorded_at, metrics) VALUES (?,?,?,?,?)
  `);
  insEval.run('e1', 'ACAD_01', 's1', now,
    JSON.stringify({ passing_accuracy: '85', one_v_one_success: '78', sprint_counts: '14' }));

  console.log('✓ Seeded 3 tenants, 7 dev users, 8 sample students');
}
