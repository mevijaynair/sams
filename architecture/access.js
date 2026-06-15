// access.js — multi-tenant role filtering for SAMS (framework-agnostic, Node).
// One source of truth for: capability checks, tenant scoping, PII/EID redaction,
// export guard, feature-flag gating, and the per-request DB context for RLS.

export const ROLES = Object.freeze({
  PLATFORM_OWNER: 'platform_owner',
  SUPPORT_ADMIN: 'support_admin',
  ACADEMY_SUPER_ADMIN: 'academy_super_admin',
  COACH_STAFF: 'coach_staff'
});

// Capability = "domain:action". Player PII/EID/financials/export live only with
// the academy super admin; platform roles never touch tenant player data.
const CAPS = Object.freeze({
  platform_owner:      new Set(['flags:manage', 'academies:manage', 'schema:upgrade', 'config:cross_tenant', 'metrics:global']),
  support_admin:       new Set(['infra:read']),
  academy_super_admin: new Set(['players:read', 'players:write', 'players:single_entry',
                                'attendance:checkin', 'performance:score',
                                'financials:read', 'financials:write',
                                'eid:read', 'eid:write', 'export:run']),
  coach_staff:         new Set(['players:read', 'players:single_entry',
                                'attendance:checkin', 'performance:score'])
});

// Sensitive Extension fields stripped from API output unless the cap is held.
const SENSITIVE = Object.freeze({
  player_eid_vault:  { cap: 'eid:read',        fields: ['eid_number', 'eid_expiry', 'document_uri', 'verified'] },
  player_financials: { cap: 'financials:read', fields: ['fee_plan_type', 'fee_rate', 'package_total', 'package_remaining', 'payment_status', 'freeze_range'] }
});

export class AccessError extends Error {
  constructor(message, status = 403) { super(message); this.status = status; }
}

export function can(actor, capability) {
  return !!actor && CAPS[actor.role]?.has(capability);
}

export function assertCan(actor, capability) {
  if (!can(actor, capability)) {
    throw new AccessError(`Forbidden: ${actor?.role || 'anon'} lacks ${capability}`);
  }
}

// Resolve the data scope for an actor.
//  crossTenant -> may read across academies (platform roles only)
//  academyId   -> the silo a tenant-scoped actor is locked to
//  sportScope  -> coaches are additionally narrowed to their sport
//  deniesPlayerData -> platform/support roles never see tenant player rows
export function scopeFor(actor) {
  switch (actor?.role) {
    case ROLES.PLATFORM_OWNER:
      return { crossTenant: true, academyId: null, sportScope: null, deniesPlayerData: true };
    case ROLES.SUPPORT_ADMIN:
      return { crossTenant: true, academyId: null, sportScope: null, deniesPlayerData: true };
    case ROLES.ACADEMY_SUPER_ADMIN:
      return { crossTenant: false, academyId: actor.academy_id, sportScope: null, deniesPlayerData: false };
    case ROLES.COACH_STAFF:
      return { crossTenant: false, academyId: actor.academy_id, sportScope: actor.sport || null, deniesPlayerData: false };
    default:
      throw new AccessError('Unknown role', 401);
  }
}

// Build the tenant WHERE fragment for any academy-scoped table query.
// Platform/support roles are blocked from tenant player data here, by design.
export function tenantFilter(actor, { table = 'players', alias = '' } = {}) {
  const s = scopeFor(actor);
  const col = alias ? `${alias}.academy_id` : 'academy_id';
  const sportCol = alias ? `${alias}.sport` : 'sport';

  if (s.deniesPlayerData) {
    throw new AccessError(`${actor.role} has no access to ${table}`);
  }
  const where = [`${col} = $academyId`];
  const params = { academyId: s.academyId };
  if (s.sportScope) { where.push(`${sportCol} = $sport`); params.sport = s.sportScope; }
  return { sql: where.join(' AND '), params };
}

// Strip sensitive Extension fields the actor isn't allowed to see.
export function redact(entity, row, actor) {
  const rule = SENSITIVE[entity];
  if (!rule || can(actor, rule.cap) || row == null) return row;
  const clone = { ...row };
  for (const f of rule.fields) delete clone[f];
  return clone;
}
export const redactAll = (entity, rows, actor) => rows.map(r => redact(entity, r, actor));

// Exports are an academy-super-admin privilege only.
export function assertExport(actor) {
  if (!can(actor, 'export:run')) throw new AccessError('Data export not permitted for this role');
}

// Feature-flag gate. `resolve(academyId, key)` returns the effective boolean
// (override ?? default). Extension features are inert when the flag is off, so
// Core player data keeps working regardless.
export function requireFeature(resolve, academyId, key) {
  if (!resolve(academyId, key)) {
    throw new AccessError(`Feature '${key}' is disabled for this academy`, 409);
  }
}

// Per-request DB context so Postgres RLS + the delta-log capture trigger know
// who is acting. Call once on a checked-out pg client at the start of a request.
export async function bindDbContext(client, actor) {
  await client.query('SELECT set_config($1,$2,true), set_config($3,$4,true), set_config($5,$6,true)', [
    'app.role', actor.role,
    'app.academy_id', actor.academy_id || '',
    'app.user_id', actor.id || ''
  ]);
}

// ── Example Express middleware ────────────────────────────────────────────
// const requireCap = (cap) => (req, res, next) => {
//   try { assertCan(req.user, cap); next(); }
//   catch (e) { res.status(e.status || 403).json({ error: e.message }); }
// };
// app.get('/api/players', requireCap('players:read'), async (req, res) => {
//   const { sql, params } = tenantFilter(req.user, { table: 'players' });
//   const rows = await db.any(`SELECT * FROM players WHERE ${sql}`, params);
//   res.json(rows); // join player_financials/eid -> redact(entity, row, req.user)
// });
