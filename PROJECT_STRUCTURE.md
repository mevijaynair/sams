# Project Structure — FMSS Ecosystem (3 Projects)

**Overview:** Three Node.js applications deployed as subdomains on fmss.ae ecosystem

**Last Updated:** 2026-06-17

---

## 🏗️ Deployment Architecture

```
/opt/fmss-platform/
├── apps/
│   ├── sams/                    (Main project — Sports Academy Management)
│   ├── quiz/                    (Annual Day Quiz app)
│   └── contracts/               (Football Contracts & Fee Management)
├── caddy/                        (Reverse proxy config & certificates)
└── shared/                       (Shared dependencies, if any)
```

---

## 📱 PROJECT 1: SAMS (Sports Academy Management System)

**Domain:** https://sams.fmss.ae  
**Port:** 3000  
**Path:** `/opt/fmss-platform/apps/sams`  
**Status:** 🟢 ACTIVE & PRODUCTION

### Full Directory Structure

```
/opt/fmss-platform/apps/sams/
│
├── 📁 server/                          (Backend: Node.js/Express)
│   ├── index.js                        (Entry point, Express app setup)
│   ├── auth.js                         (JWT, password hashing, token generation)
│   ├── db.js                           (SQLite initialization, migrations)
│   ├── middleware.js                   (Auth guard, tenant resolver, permission checks)
│   ├── validators.js                   (Input validation schemas)
│   ├── permissions.js                  (RBAC role-based access control)
│   │
│   ├── 📁 routes/                      (API endpoint handlers)
│   │   ├── index.js                    (Router setup, endpoint mounting)
│   │   ├── auth.js                     (POST /login, /refresh, /logout, /dev-login, /dev-accounts)
│   │   ├── passwordReset.js            (POST /forgot-password, /reset-password, /invite-accept)
│   │   ├── students.js                 (CRUD for students)
│   │   ├── parents.js                  (Parent-student relationships)
│   │   ├── attendance.js               (Session attendance tracking)
│   │   ├── evaluations.js              (Performance metrics per student)
│   │   ├── billing.js                  (Fee plans, invoices, payments)
│   │   ├── users.js                    (Staff account management)
│   │   ├── tenants.js                  (Academy/organization management)
│   │   ├── export.js                   (CSV export routes)
│   │   └── audit.js                    (Audit log queries)
│   │
│   ├── 📁 repos/                       (Database access layer)
│   │   ├── users.js                    (User CRUD, password management)
│   │   ├── students.js                 (Student queries, enrollments)
│   │   ├── parents.js                  (Parent queries, relationships)
│   │   ├── attendance.js               (Attendance records)
│   │   ├── evaluations.js              (Performance evaluation storage)
│   │   ├── billing.js                  (Fee tracking, payments)
│   │   ├── tenants.js                  (Academy data)
│   │   ├── passwordResets.js           (Token management for password reset)
│   │   └── audit.js                    (Change audit log)
│   │
│   ├── 📁 migrations/                  (Database schema versions)
│   │   ├── 001_init.sql                (Initial schema: users, tenants, students, etc.)
│   │   └── 002_password_resets.sql     (Password reset tokens table)
│   │
│   ├── email.js                        (Resend email transactional emails)
│   └── seed.js                         (Demo data for development)
│
├── 📁 public/                          (Frontend: HTML/CSS/JS — served statically)
│   ├── index.html                      (Single-page app entry point)
│   │                                   (Login form, app shell, dark mode script)
│   │
│   ├── 📁 css/
│   │   └── styles.css                  (All styling: layout, colors, responsive, dark mode)
│   │
│   ├── 📁 js/
│   │   ├── main.js                     (Bootstrap, auth flow, nav wiring, dev mode toggle)
│   │   ├── api.js                      (HTTP client wrapper for API calls)
│   │   ├── store.js                    (Global state: auth, user, permissions, students)
│   │   ├── router.js                   (SPA navigation, view switching)
│   │   ├── theme.js                    (Dark/light mode toggle)
│   │   ├── graphics.js                 (Sport icons, colors, visual utilities)
│   │   │
│   │   ├── 📁 modules/                 (Feature modules, one per view)
│   │   │   ├── dashboard.js            (KPI cards, billing/churn analytics)
│   │   │   ├── roster.js               (Student registry, enrolment columns)
│   │   │   ├── admin.js                (User/staff management, invite forms)
│   │   │   ├── attendance.js           (Session attendance checklist)
│   │   │   ├── pitch.js                (Performance matrix, evaluations form)
│   │   │   ├── billing.js              (Fee tracking, payment status)
│   │   │   ├── parents.js              (Parent linking, contact info)
│   │   │   ├── audit.js                (Audit log viewer)
│   │   │   └── settings.js             (Tenant config, academy details)
│   │   │
│   │   └── 📁 config/
│   │       └── sportMetrics.js         (Sport-adaptive metric definitions)
│   │
│   ├── 📁 images/                      (Icons, logos, graphics)
│   └── player_naming.html              (Utility page for player name references)
│
├── 📁 data/                            (Runtime data directory)
│   └── sams.db                         (SQLite database file — production data)
│
├── 📁 node_modules/                    (npm dependencies)
├── 📁 _archive/                        (Old/deprecated files)
├── 📁 architecture/                    (Architecture diagrams)
├── 📁 projects/                        (Sub-projects: quiz, contracts)
│   ├── quiz/
│   │   └── server.js
│   └── contracts/
│       └── server.js
│
├── .env                                (Production environment variables)
├── .env.example                        (Template for .env)
├── .gitignore                          (Git ignore rules)
├── package.json                        (npm dependencies & scripts)
├── package-lock.json                   (Locked dependency versions)
│
├── Caddyfile                           (Reverse proxy: all 3 domains)
├── sams.service                        (Systemd service unit file)
├── Dockerfile                          (Container image definition)
├── README.md                           (Project overview)
├── DEPLOY.md                           (Production deployment guide)
├── SYSTEM_CONFIG.md                    (All technical details & IPs)
└── PROJECT_STRUCTURE.md                (This file)
```

---

## 🎮 PROJECT 2: ANNUAL DAY QUIZ

**Domain:** https://quiz.fmss.ae  
**Port:** 3001  
**Path:** `/opt/fmss-platform/apps/quiz`  
**Status:** 📋 READY (Starter template deployed)

### Directory Structure

```
/opt/fmss-platform/apps/quiz/
│
├── server.js                           (Express app entry point)
│                                       (Mock endpoints for quiz API)
│
├── public/                             (Frontend files)
│   ├── index.html                      (Quiz UI)
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
│
├── .env                                (Quiz env vars)
├── package.json                        (Dependencies)
└── quiz.service                        (Systemd service)
```

### Mock API Endpoints (Implemented)
```javascript
GET  /api/quizzes                      (List all quizzes)
POST /api/quizzes/:id/teams            (Register team for quiz)
POST /api/quizzes/:id/score            (Submit score/answers)
GET  /api/quizzes/:id/leaderboard      (View rankings)
GET  /api/health                       (Health check)
```

### Features to Build
- [ ] Multi-round quiz logic
- [ ] Real-time leaderboard updates (WebSocket)
- [ ] Team management & scoring
- [ ] Mobile-responsive quiz UI
- [ ] Timer for each round
- [ ] Score calculation engine

---

## 📝 PROJECT 3: FOOTBALL CONTRACTS

**Domain:** https://contracts.fmss.ae  
**Port:** 3002  
**Path:** `/opt/fmss-platform/apps/contracts`  
**Status:** 📋 READY (Starter template deployed)

### Directory Structure

```
/opt/fmss-platform/apps/contracts/
│
├── server.js                           (Express app entry point)
│                                       (Mock endpoints for contracts API)
│
├── public/                             (Frontend files)
│   ├── index.html                      (Contracts dashboard)
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
│
├── .env                                (Contracts env vars)
├── package.json                        (Dependencies)
└── contracts.service                   (Systemd service)
```

### Mock API Endpoints (Implemented)
```javascript
GET  /api/contracts                    (List contracts)
POST /api/contracts                    (Create contract)
GET  /api/contracts/:id                (View contract details)
PUT  /api/contracts/:id                (Update contract)
DELETE /api/contracts/:id              (Archive contract)
POST /api/contracts/:id/sign           (Sign contract)
GET  /api/contracts/:id/payments       (Payment history)
GET  /api/dashboard                    (KPI dashboard)
GET  /api/health                       (Health check)
```

### Features to Build
- [ ] Contract template management
- [ ] Digital signature capture
- [ ] Fee schedule & payment tracking
- [ ] Automated invoice generation
- [ ] Payment reminders (email)
- [ ] Contract renewal alerts
- [ ] Dashboard with KPIs (active, expired, pending)

---

## 🌐 Shared Infrastructure

### Reverse Proxy Configuration (`/etc/caddy/Caddyfile`)

```
fmss.ae {
  reverse_proxy localhost:8000
  # (Main club website — to be implemented)
}

sams.fmss.ae {
  reverse_proxy localhost:3000
  # (SAMS production — ACTIVE)
}

quiz.fmss.ae {
  reverse_proxy localhost:3001
  # (Quiz app)
}

contracts.fmss.ae {
  reverse_proxy localhost:3002
  # (Contracts app)
}

www.fmss.ae {
  redir https://fmss.ae{uri} permanent
}
```

### Systemd Services

```bash
/etc/systemd/system/
├── fmss-sams.service          (SAMS app — active)
├── fmss-quiz.service          (Quiz app — to be created)
├── fmss-contracts.service     (Contracts app — to be created)
└── caddy.service              (Reverse proxy — active)
```

---

## 📊 Technology Stack (All 3 Projects)

| Layer | Technology | Details |
|-------|-----------|---------|
| **Runtime** | Node.js 24 | JavaScript backend |
| **Framework** | Express.js | Web server & routing |
| **Database** | SQLite 3 | File-based (SAMS only; Quiz & Contracts: to be added) |
| **Auth** | JWT + httpOnly Cookies | Token-based + refresh tokens |
| **Email** | Resend API | Transactional email (SAMS) |
| **Reverse Proxy** | Caddy | Auto-HTTPS, domain routing |
| **Frontend** | Vanilla JS + CSS | No frameworks (SAMS); can add React/Vue for Quiz/Contracts |
| **Containerization** | Docker | Multi-stage builds |
| **Init System** | Systemd | Service auto-start & restart |

---

## 🔄 Development Workflow

### For SAMS (Active Development)

```bash
# 1. Clone/update
cd /opt/fmss-platform/apps/sams
git pull origin main

# 2. Install dependencies (if needed)
npm ci --only=production

# 3. Restart service
sudo systemctl restart fmss-sams

# 4. Check logs
sudo journalctl -u fmss-sams -f
```

### For Quiz & Contracts (To Be Completed)

```bash
# 1. Clone from GitHub (when ready)
git clone <repo-url> /opt/fmss-platform/apps/quiz
git clone <repo-url> /opt/fmss-platform/apps/contracts

# 2. Configure .env
cp .env.example .env
nano .env  # Set PORT, database path, etc.

# 3. Install & initialize
npm ci --only=production
npm run migrate  # (if using migrations)

# 4. Create systemd service
sudo cp <project>/quiz.service /etc/systemd/system/fmss-quiz.service
sudo systemctl daemon-reload
sudo systemctl enable fmss-quiz
sudo systemctl start fmss-quiz

# 5. Update Caddyfile
sudo nano /etc/caddy/Caddyfile  # Add subdomain block
sudo systemctl reload caddy
```

---

## 📂 File Organization Principles

### Backend (server/)
- **routes/** → API endpoints (one file per resource)
- **repos/** → Database queries (mirrors routes structure)
- **migrations/** → Schema versioning (001_, 002_, etc.)
- **middleware.js** → Auth, validation, tenant resolution
- **auth.js** → JWT, password hashing (no SQL access)
- **db.js** → Connection, migrations runner (no business logic)

### Frontend (public/)
- **js/modules/** → One file per feature/view
- **js/config/** → Static configuration (metrics, sports, etc.)
- **js/main.js** → Bootstrap, global wiring
- **css/styles.css** → All styles (no build step)
- **index.html** → Single entry point (no templating)

### Shared Assets
- **Caddyfile** → One file, all 3+ domain routing
- **.env** → One file per environment (dev, prod)
- **systemd/*.service** → One per project (auto-start)

---

## 🚀 Deployment Order

1. **SAMS** ✅ (Already deployed & active)
2. **Caddy** ✅ (Already configured for all 3 domains)
3. **Quiz** 📋 (Deploy starter, build features)
4. **Contracts** 📋 (Deploy starter, build features)
5. **Main Club Site (fmss.ae)** 🔜 (From other project)

---

## 📝 Key Files for Quick Reference

| File | Purpose | Edit When |
|------|---------|-----------|
| `.env` | Production config | Changing secrets, ports, database path |
| `.env.example` | Template | Adding new env vars |
| `package.json` | Dependencies | Adding npm packages |
| `Caddyfile` | Domain routing | Adding/removing subdomains |
| `/etc/caddy/Caddyfile` | Production routing | Same (sync with repo version) |
| `/etc/systemd/system/*.service` | Auto-start config | Changing ports, users, paths |
| `server/db.js` | Database schema | Adding tables (via migrations) |
| `server/middleware.js` | Auth/permissions | Changing access control |
| `public/index.html` | App entry point | Never edit (served as-is) |

---

## 🔐 Security Boundary Notes

### Public Access
```
https://sams.fmss.ae/           ✅ Open to all (login required after)
https://quiz.fmss.ae/           ✅ Open to all
https://contracts.fmss.ae/      ✅ Open to all
```

### Database Access
```
Only via backend API (no direct DB access from frontend)
JWT tokens validated on every request
Tenant isolation enforced in middleware
```

### Secret Management
```
Production secrets in .env (NOT in code)
RESEND_API_KEY used only in server/email.js
JWT_SECRET used in server/auth.js
All stored in /opt/fmss-platform/apps/sams/.env
```

---

## 📚 Related Documentation

- **SYSTEM_CONFIG.md** — Server IPs, paths, credentials
- **DEPLOY.md** — Step-by-step production setup
- **CLAUDE.md** (in root) — Project rules & critical context
- **README.md** — Project overview
- **DOCUMENTATION/** — Architecture, decisions, roadmap

---

**Last Updated:** 2026-06-17  
**Maintainer:** Claude Code (AI Agent)  
**Update Frequency:** When new projects deploy or structure changes
