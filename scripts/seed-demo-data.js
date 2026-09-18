// scripts/seed-demo-data.js
// Populate ONE academy (tenant) with realistic demo data so every screen
// — Students, Parents, Attendance, Performance, Billing — has something to show.
//
// Safe to run on production. It writes to the same DB the server uses.
//
// Usage (run from the app root, e.g. /opt/fmss-platform/apps/sams):
//   SEED_TENANT=ACAD_XXXXXX node scripts/seed-demo-data.js
//   SEED_TENANT=ACAD_XXXXXX SEED_COUNT=16 node scripts/seed-demo-data.js
//   FORCE=1 SEED_TENANT=ACAD_XXXXXX node scripts/seed-demo-data.js   # seed even if students already exist
//
// Find your tenant id on the Academies screen (the <code> value), or run with
// no SEED_TENANT to list the academies and their ids.

import * as Students from '../server/repos/students.js';
import { Parents } from '../server/repos/parents.js';
import * as Attendance from '../server/repos/attendance.js';
import * as Evaluations from '../server/repos/evaluations.js';
import * as Tenants from '../server/repos/tenants.js';
import { metricsFor } from '../public/js/config/sportMetrics.js';

// ---------- helpers ----------
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const chance = (p) => Math.random() < p;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const iso = (d) => d.toISOString().slice(0, 10);

const FIRST = ['Zayd','Ryan','Sami','Aarav','Yusuf','Leah','Omar','Diego','Aisha','Noah','Maya','Ali',
  'Hana','Ibrahim','Sofia','Lucas','Fatima','Ethan','Layla','Adam','Zara','Kai','Nadia','Rayan'];
const LAST = ['Nair','Al-Mansoori','Okafor','Sharma','Khan','Court','Haddad','Reyes','Ahmed','Silva',
  'Patel','Hassan','Costa','Rahman','Mendez','Farah','Iqbal','Santos','Aziz','Malik'];
const EXIT_REASONS = ['Relocated','Cost','Schedule clash','Switched academy','Lost interest'];
const AGE_GROUPS = ['U6-U9','U10-U13','U14-U18'];

function randomEID() {
  const yr = 2005 + rnd(18);
  return `784-${yr}-${1000000 + rnd(8999999)}-${rnd(9)}`;
}
function futureDate(minDays, maxDays) {
  const d = new Date();
  d.setDate(d.getDate() + minDays + rnd(maxDays - minDays));
  return iso(d);
}

// a plausible value for a metric, respecting its type/bounds
function metricValue(m) {
  const def = Number(m.def ?? 5);
  if (m.type === 'percent') return String(clamp(Math.round(def + (rnd(41) - 20)), 0, 100));
  if (m.type === 'rating')  return String(clamp(Math.round(def + (rnd(5) - 2)), 0, 10));
  if (m.type === 'count')   return String(clamp(Math.round(def * (0.6 + Math.random() * 0.8)), m.min ?? 0, m.max ?? 999));
  // number
  const step = m.step || 1;
  const raw = def * (0.8 + Math.random() * 0.4);
  const snapped = Math.round(raw / step) * step;
  return String(clamp(Number(snapped.toFixed(2)), m.min ?? 0, m.max ?? def * 3));
}

// ---------- main ----------
const tenantId = (process.env.SEED_TENANT || '').trim();
const count = Math.max(4, Math.min(60, parseInt(process.env.SEED_COUNT, 10) || 12));
const force = process.env.FORCE === '1';

const all = Tenants.list();
if (!tenantId) {
  console.log('No SEED_TENANT given. Available academies:');
  if (!all.length) console.log('  (none — create an academy in the app first)');
  for (const t of all) console.log(`  ${t.id}   ${t.name}   [${t.sports.join(', ')}]`);
  console.log('\nRe-run with:  SEED_TENANT=<id> node scripts/seed-demo-data.js');
  process.exit(all.length ? 0 : 1);
}

const tenant = Tenants.get(tenantId);
if (!tenant) {
  console.error(`Academy "${tenantId}" not found. Run with no SEED_TENANT to list valid ids.`);
  process.exit(1);
}

const existing = Students.list(tenantId);
if (existing.length && !force) {
  console.error(`Academy "${tenant.name}" already has ${existing.length} students. Re-run with FORCE=1 to add demo data anyway.`);
  process.exit(1);
}

const sports = tenant.sports?.length ? tenant.sports : ['Football'];
console.log(`Seeding "${tenant.name}" (${tenantId}) — sports: ${sports.join(', ')} — ${count} students...`);

// --- students ---
const students = [];
for (let i = 0; i < count; i++) {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const sport = pick(sports);
  const plan = pick(['monthly', 'monthly', 'monthly', 'per_session', 'package']); // monthly most common
  let fee_rate = 0, package_sessions = 0, package_remaining = 0;
  if (plan === 'monthly') fee_rate = pick([350, 400, 450, 500, 550]);
  else if (plan === 'per_session') fee_rate = pick([50, 60, 75]);
  else { fee_rate = pick([500, 800, 1000]); package_sessions = pick([10, 16, 20]); package_remaining = rnd(package_sessions + 1); }

  // guarantee some churn data (first student exits) so the churn chart isn't empty
  const exited = i === 0 ? true : chance(0.12);
  const s = Students.create(tenantId, {
    name, sport, age_group: pick(AGE_GROUPS),
    eid_number: randomEID(), eid_expiry: chance(0.15) ? futureDate(5, 45) : futureDate(120, 900),
    fee_plan_type: plan, fee_rate, package_sessions, package_remaining,
    payment_status: exited ? 'Due' : pick(['Paid', 'Paid', 'Paid', 'Due', 'Overdue']),
    last_payment_date: futureDate(-60, -1),
    account_status: exited ? 'Exited' : 'Active',
    exit_reason: exited ? pick(EXIT_REASONS) : '',
  });
  students.push(s);
}
const active = students.filter(s => s.account_status === 'Active');
console.log(`  ✓ ${students.length} students (${active.length} active, ${students.length - active.length} exited)`);

// --- parents (linked to children) ---
let parentCount = 0, linkCount = 0;
const pool = [...active];
while (pool.length) {
  const kids = pool.splice(0, chance(0.25) && pool.length >= 2 ? 2 : 1); // ~25% siblings
  const surname = kids[0].name.split(' ').slice(-1)[0];
  const p = Parents.create(tenantId, {
    name: `${pick(['Mr','Mrs','Ms'])} ${pick(FIRST)} ${surname}`,
    email: `${surname.toLowerCase().replace(/[^a-z]/g,'')}.${rnd(999)}@example.com`,
    phone: `+9715${rnd(9)} ${100 + rnd(899)} ${1000 + rnd(8999)}`,
    relationship: pick(['Parent', 'Parent', 'Guardian']),
  });
  parentCount++;
  kids.forEach((k, idx) => { Parents.linkStudent(tenantId, k.id, p.id, idx === 0 ? 1 : 0); linkCount++; });
}
console.log(`  ✓ ${parentCount} parents, ${linkCount} child links`);

// --- attendance: last ~8 sessions (Mon/Wed/Fri) ---
const sessions = [];
{
  const d = new Date();
  while (sessions.length < 8) {
    const day = d.getDay();
    if (day === 1 || day === 3 || day === 5) sessions.push(iso(new Date(d)));
    d.setDate(d.getDate() - 1);
  }
}
let attMarks = 0;
for (const date of sessions) {
  for (const s of active) {
    // ~85% attendance, a few students are flakier
    const present = chance(0.85 - (s.id.charCodeAt(0) % 5) * 0.03);
    if (Attendance.mark(tenantId, s.id, date, present)) attMarks++;
  }
}
console.log(`  ✓ attendance across ${sessions.length} sessions (${attMarks} records)`);

// --- evaluations: 1–3 per active student ---
let evalCount = 0;
for (const s of active) {
  const metrics = metricsFor(s.sport);
  if (!metrics.length) continue;
  const n = 1 + rnd(3);
  for (let e = 0; e < n; e++) {
    const record = {};
    for (const m of metrics) record[m.key] = metricValue(m);
    Evaluations.create(tenantId, s.id, record);
    evalCount++;
  }
}
console.log(`  ✓ ${evalCount} performance evaluations`);

console.log(`\nDone. Select "${tenant.name}" in the top academy switcher to see it populated.`);
