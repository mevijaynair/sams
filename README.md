# SAMS — Sports Academy Management System

Multi-tenant academy operations: enrolment & UAE compliance (EID vault),
billing/holiday-freeze states, pitch-performance evaluation matrices,
pitch-side attendance roster, parent-communication formatting, and a
billing/churn analytics dashboard.

Free to run locally now; the data layer is isolated behind `server/repos/`
so it ports to Postgres + a paid host (Render/Railway/Fly/Vercel) later.

## Stack

- **Backend:** Node + Express (`server/`)
- **Database:** built-in `node:sqlite` → single file at `data/sams.db` (nothing to install)
- **Frontend:** vanilla JS ES modules (`public/`), served by Express

## Run

```bash
npm install
npm start          # → http://localhost:3000   (auto-creates + seeds data/sams.db)
npm run dev        # same, with --watch auto-restart
npm run seed       # (re)seed demo data on an empty DB
```

Reset the database: stop the server and delete `data/sams.db*`, then start again.

## Multi-tenancy

Every `/api/*` call (except `GET /api/tenants`) must name a tenant via the
`X-Tenant-Id` header or `?tenant=` query param. The tenant is validated and
applied server-side to every query — request bodies cannot set their own
tenant, which is what keeps tenants isolated. The UI selector sets the header.

## Layout

```
server/
  index.js          Express entry (API + static frontend)
  db.js             node:sqlite connection, schema, seed
  repos/            students, evaluations, attendance  (all tenant-scoped)
  routes/           students, evaluations, attendance, analytics, export, index (tenant guard)
public/
  index.html, css/, js/ (api, store, data, util, config, modules/*)
data/sams.db        created on first run (gitignored)
_archive/           original single-file prototype, kept for reference
```

## Porting to paid hosting

1. Swap `node:sqlite` in `server/db.js` + `server/repos/*` for a Postgres client
   (e.g. `pg`); the SQL is standard. The repo function signatures stay the same.
2. Set `PORT` and a DB connection env var on the host.
3. Add auth (session/JWT) in `routes/index.js` and derive `req.tenantId` from the
   authenticated user instead of a header for production security.
