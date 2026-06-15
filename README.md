# SAMS — Sports Academy Management System

Multi-tenant academy operations with role-based access. The platform supports
many sports, but **sport belongs to the academy**: each academy is configured
with the sport(s) it runs. Single-sport academies (the common case) get a fully
sport-aligned experience — no sport pickers, columns, or cross-sport breakdowns;
the sport is shown as the academy's identity. An academy can be configured for
several sports, and only then do sport selectors/breakdowns appear.

- **Auth & RBAC** — login with 3 roles (Super Admin, Academy Admin, Coach)
- **Sport per academy** — Football / Cricket / Basketball / Badminton, with
  sport-specific performance metric matrices; UI auto-adapts single vs multi-sport
- **Enrolment & UAE compliance** — EID vault + expiry watchlist
- **Modular fees** — Monthly flat / Per-session (rate × sessions) / Package
  (prepaid sessions, counted down)
- **Attendance roster** — pitch-side tap-to-toggle + streak analytics
- **Parent comms** — WhatsApp / SMS / Email report formatting
- **Billing & churn dashboard**

Free to run locally now; the data layer is isolated behind `server/repos/` so it
ports to Postgres + a paid host (Render/Railway/Fly/Vercel) later.

## Stack

- **Backend:** Node + Express (`server/`)
- **Database:** built-in `node:sqlite` → single file at `data/sams.db` (nothing to install)
- **Frontend:** vanilla JS ES modules (`public/`) — app shell with sidebar nav, one view at a time
- **Auth:** scrypt-hashed passwords + opaque Bearer tokens (`auth_sessions` table)

## Run

```bash
npm install
npm start          # → http://localhost:3000   (auto-creates + seeds data/sams.db)
npm run dev        # same, with --watch auto-restart
npm run seed       # (re)seed demo data on an empty DB
```

Reset the database: stop the server and delete `data/sams.db*`, then start again
(the schema changed when auth/multi-sport were added, so reset if upgrading).

## Dev login (seeded accounts)

The login screen has one-click **DEV quick-login** buttons. Credentials:

| Role          | Email                  | Password   | Scope |
|---------------|------------------------|------------|-------|
| Super Admin   | super@sams.dev         | super123   | all academies; manages tenants & users |
| Academy Admin | admin@apex.dev         | admin123   | Apex Football Academy (single-sport) |
| Coach         | football@apex.dev      | coach123   | Apex · Football (read students, attendance + performance) |
| Academy Admin | admin@royal.dev        | admin123   | Royal Cricket Academy (single-sport) |
| Coach         | cricket@royal.dev      | coach123   | Royal · Cricket |
| Academy Admin | admin@skyline.dev      | admin123   | Skyline Sports Club (multi-sport: Football/Basketball/Badminton) |
| Coach         | basketball@skyline.dev | coach123   | Skyline · Basketball |

> ⚠️ Dev passwords are intentionally weak and quick-login is a dev convenience —
> remove `DEV_ACCOUNTS` (in `public/js/main.js`) and the quick-login panel before
> any real deployment, and rotate the seeded passwords.

## RBAC

Roles and their permissions are the single source of truth in
`server/permissions.js`. The server enforces every check; the client only uses
its permission list to show/hide nav and controls.

- **Super Admin** — everything, across all tenants; picks the active tenant via
  the top-bar switcher (sent as `X-Tenant-Id`).
- **Academy Admin** — full access *within their own tenant*, including staff
  management; cannot create tenants or act cross-tenant.
- **Coach** — read students, plus attendance & performance, **scoped to their
  own sport**; no billing, comms, or user management.

## Multi-tenancy

Tenant is resolved server-side (`server/middleware.js`): super admins choose it
via the `X-Tenant-Id` header; everyone else is locked to their own tenant.
Request bodies can never set their own tenant.

## Layout

```
server/
  index.js          Express entry (API + static frontend)
  db.js             node:sqlite connection, schema, seed
  auth.js           password hashing + session token helpers
  permissions.js    RBAC matrix (roles → permissions)
  middleware.js     requireAuth, resolveTenant, requirePerm
  billing.js        modular fee computation (pure functions)
  repos/            students, evaluations, attendance, users, tenants (tenant-scoped)
  routes/           auth, students, evaluations, attendance, analytics,
                    billing, users, tenants, export, index (auth+gates)
public/
  index.html        app shell (login + sidebar + views)
  css/styles.css
  js/               api, store, data, router, util, config
  js/modules/       admin, pitch, attendance, roster, comms, dashboard,
                    billing, users, settings
data/sams.db        created on first run (gitignored)
_archive/           original single-file prototype, kept for reference
```

## Porting to paid hosting

1. Swap `node:sqlite` in `server/db.js` + `server/repos/*` for a Postgres client
   (e.g. `pg`); the SQL is standard and repo signatures stay the same.
2. Set `PORT` and a DB connection env var on the host.
3. Harden auth: move the token to an httpOnly cookie (or short-lived JWT +
   refresh), shorten the session TTL in `server/auth.js`, and remove the dev
   quick-login.
