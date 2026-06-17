# SAMS System Configuration & Technical Details

**Last Updated:** 2026-06-17  
**Environment:** Production (fmss.ae ecosystem)

---

## 🖥️ Server & Infrastructure

### Production Server
- **Hostname:** fmss-web-prod
- **IP Address:** 139.59.135.213
- **OS:** Ubuntu 22.04 LTS
- **SSH:** `ssh root@fmss-web-prod`
- **User:** root

### Domain Structure
| Domain | Purpose | Port | Status |
|--------|---------|------|--------|
| fmss.ae | FMSS Football Club (main) | 443 (HTTPS) | 🟢 Caddy |
| sams.fmss.ae | SAMS (Sports Academy Management) | 443 → 3000 | 🟢 Active |
| quiz.fmss.ae | Annual Day Quiz | 443 → 3001 | 📋 Ready |
| contracts.fmss.ae | Football Contracts | 443 → 3002 | 📋 Ready |

---

## 🗄️ Database Configuration

### SAMS Database
- **Type:** SQLite 3
- **Path:** `/opt/fmss-platform/apps/sams/data/sams.db`
- **User:** (none - file-based)
- **Connection:** `sqlite3 /opt/fmss-platform/apps/sams/data/sams.db`

### Dev Account (Super Admin)
```
Email: super@sams.dev
Password: super123
Role: super_admin
Status: ACTIVE ✅
```

### Other Dev Accounts
| Email | Password | Role | Academy |
|-------|----------|------|---------|
| `admin@apex.dev` | `admin123` | admin | Apex Football |
| `football@apex.dev` | `coach123` | coach | Football |
| `admin@royal.dev` | `admin123` | admin | Royal Cricket |
| `admin@skyline.dev` | `admin123` | admin | Skyline Multi-sport |

### Database Tables
- `users` — User accounts, auth, roles
- `tenants` — Academy/tenant organizations
- `students` — Student enrollments
- `parents` — Parent/guardian info
- `attendance` — Session attendance tracking
- `billing` — Fee plans, payments, invoices
- `audit_logs` — Change audit trail
- `password_resets` — Token-based password reset
- `evaluations` — Performance metrics per student

---

## 📁 Project Paths

### Application Root
```
/opt/fmss-platform/apps/sams
```

### Key Directories
| Path | Purpose |
|------|---------|
| `/opt/fmss-platform/apps/sams` | SAMS root |
| `/opt/fmss-platform/apps/sams/server` | Backend (Node.js/Express) |
| `/opt/fmss-platform/apps/sams/public` | Frontend (HTML/CSS/JS) |
| `/opt/fmss-platform/apps/sams/data` | SQLite database directory |
| `/opt/fmss-platform/apps/sams/node_modules` | npm dependencies |
| `/opt/fmss-platform/apps/sams/.env` | Environment variables (production) |

---

## 🔧 Services & Ports

### Active Services
```bash
# SAMS API Server
sudo systemctl status fmss-sams
sudo systemctl restart fmss-sams
Port: 3000 (localhost)
User: www-data
Service: /etc/systemd/system/fmss-sams.service

# Caddy (Reverse Proxy + HTTPS)
sudo systemctl status caddy
sudo systemctl restart caddy
Ports: 80 (HTTP), 443 (HTTPS)
Config: /etc/caddy/Caddyfile
User: caddy

# Nginx (killed - replaced by Caddy)
sudo systemctl status nginx
```

### Port Mappings
| Service | Port | Type | Notes |
|---------|------|------|-------|
| SAMS | 3000 | Internal | Node.js app server |
| Caddy HTTP | 80 | Public | Auto-redirects to HTTPS |
| Caddy HTTPS | 443 | Public | Reverse proxy for all domains |
| Quiz | 3001 | Internal | (To be deployed) |
| Contracts | 3002 | Internal | (To be deployed) |

---

## 🌍 Environment Variables

### SAMS Service (`/etc/systemd/system/fmss-sams.service`)
```ini
[Service]
Environment="NODE_ENV=production"
Environment="PORT=3000"
```

### Application Config (`.env`)
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<generated-secret>
SAMS_DB_PATH=/opt/fmss-platform/apps/sams/data/sams.db
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=SAMS <noreply@fmss.ae>
APP_URL=https://sams.fmss.ae
```

---

## 🔐 Security & Authentication

### JWT Configuration
- **Algorithm:** HS256
- **Access Token TTL:** 15 minutes
- **Refresh Token TTL:** 7 days
- **Storage:** httpOnly cookies (refresh token)
- **Header:** Authorization: Bearer <access_token>

### Password Reset
- **Endpoint:** `POST /api/auth/forgot-password`
- **Token Expiry:** 1 hour
- **Storage:** Hashed with SHA-256 in `password_resets` table
- **Email Provider:** Resend (free tier)

### Dev Mode Security
- **Dev Panel:** Hidden by default (Ctrl+Shift+D to reveal)
- **Auto-Login Endpoint:** `POST /api/auth/dev-login` (dev-only)
- **Dev Accounts Endpoint:** `GET /api/auth/dev-accounts` (dev-only, returns 404 in production)
- **Status:** Production mode enforced (NODE_ENV=production)

---

## 🔗 DNS Configuration

### Hosted Domain
- **Domain:** fmss.ae
- **Registrar:** (verify with user)
- **DNS A Records:**

| Name | Type | Value | TTL |
|------|------|-------|-----|
| @ | A | 139.59.135.213 | 3600 |
| www | A | 139.59.135.213 | 3600 |
| sams | A | 139.59.135.213 | 3600 |
| quiz | A | 139.59.135.213 | 3600 |
| contracts | A | 139.59.135.213 | 3600 |
| *.fmss.ae | CNAME | fmss.ae | 3600 |

### Verify DNS
```bash
dig fmss.ae
dig sams.fmss.ae
# Should resolve to 139.59.135.213
```

---

## 🔒 SSL/HTTPS

### Certificate Authority
- **Provider:** Let's Encrypt (via Caddy)
- **Auto-Renewal:** Caddy handles automatically
- **Certificate Path:** `/var/lib/caddy/.local/share/caddy/certificates/`

### Caddy Configuration
```
# Main config file
/etc/caddy/Caddyfile

# Reverse proxy setup:
# fmss.ae → localhost:8000
# sams.fmss.ae → localhost:3000
# quiz.fmss.ae → localhost:3001
# contracts.fmss.ae → localhost:3002
```

### Verify HTTPS
```bash
curl -I https://sams.fmss.ae
# Should return: HTTP/2 200
# Check certificate: curl -vI https://sams.fmss.ae 2>&1 | grep certificate
```

---

## 📊 Git & Deployment

### GitHub Repository
- **URL:** https://github.com/mevijaynair/sams.git
- **Branch:** main
- **Clone Path:** `/opt/fmss-platform/apps/sams`

### Recent Production Commits
```
54c2377 HOTFIX: Completely disable dev panel in production (security)
ca581c6 Implement secure dev mode: hidden, password-less, locked down
bc7b18c Fix critical security issue: remove hardcoded credentials
2d4b5bc Optimize SAMS for mobile: improve touch targets and responsive layouts
```

### Pull Latest Code
```bash
cd /opt/fmss-platform/apps/sams
git config --global --add safe.directory /opt/fmss-platform/apps/sams
git pull origin main
sudo systemctl restart fmss-sams
```

---

## 🚀 Common Operations

### Start/Stop Services
```bash
# SAMS
sudo systemctl start fmss-sams
sudo systemctl stop fmss-sams
sudo systemctl restart fmss-sams
sudo systemctl status fmss-sams

# Caddy
sudo systemctl start caddy
sudo systemctl stop caddy
sudo systemctl restart caddy
sudo systemctl status caddy
```

### View Logs
```bash
# SAMS logs (last 50 lines)
sudo journalctl -u fmss-sams -n 50

# Caddy logs (live follow)
sudo journalctl -u caddy -f

# Full service status with details
sudo systemctl status fmss-sams
```

### Database Operations
```bash
# Connect to SAMS database
sqlite3 /opt/fmss-platform/apps/sams/data/sams.db

# List all tables
.tables

# Schema for specific table
.schema users

# Query users
SELECT id, email, name, role, active FROM users;

# Exit
.quit
```

### Test Connectivity
```bash
# Check port 443 (HTTPS)
sudo lsof -i :443

# Check port 3000 (SAMS)
sudo lsof -i :3000

# Test SAMS API
curl http://localhost:3000/api/health

# Test HTTPS
curl -I https://sams.fmss.ae
```

---

## 📱 Mobile Responsive Design

### Breakpoints
- **Desktop:** > 1080px (full layout)
- **Tablet:** 768px - 1080px (single column grids)
- **Mobile:** 375px - 768px (stacked layout, sidebar → top nav)
- **Small Phone:** ≤ 480px (compact buttons, larger touch targets)

### Touch Targets (Mobile)
- **Buttons:** min-height 44px, min-width 44px
- **Icon Buttons:** 44×44px minimum
- **Input Fields:** min-height 44px
- **Attendance Rows:** min-height 52px

---

## 🔍 Troubleshooting

### "Not secure" HTTPS Issue
**Problem:** Chrome shows "Not secure" despite valid certificate  
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Or reset Chrome HSTS: chrome://net-internals/#hsts → Delete domain
3. Verify Caddy: `sudo systemctl status caddy`
4. Check port 443: `sudo lsof -i :443`

### Login Fails with "Session expired"
**Problem:** Dev account login not working  
**Solution:**
1. Verify dev account exists: `sqlite3 /opt/fmss-platform/apps/sams/data/sams.db`
2. Run: `SELECT * FROM users WHERE email = 'super@sams.dev';`
3. If missing, insert: `INSERT INTO users (id, tenant_id, name, email, password_hash, role, active, created_at) VALUES ('u_super_prod', NULL, 'Super Admin', 'super@sams.dev', '$2a$10$8dyfJFaQ8E.rP.L6YLx.h.dXwJY4iI5uxfQZSjKLLCdxgMWI7XPu2', 'super_admin', 1, datetime('now'));`

### Caddy Port 443 Already In Use
**Problem:** `Error: listening on :443: bind: address already in use`  
**Solution:**
```bash
sudo lsof -i :443  # Find what's using port 443
sudo pkill -9 nginx  # Kill nginx
sudo pkill -9 caddy  # Kill old caddy
sudo systemctl restart caddy  # Start fresh
```

### Service Won't Start
**Problem:** fmss-sams service fails to start  
**Solution:**
```bash
sudo systemctl status fmss-sams  # Check error
sudo journalctl -u fmss-sams -n 20  # View logs
cd /opt/fmss-platform/apps/sams
npm ci --only=production  # Reinstall dependencies
sudo systemctl restart fmss-sams
```

---

## 📝 Quick Reference

### Logging In (Production)
```
URL: https://sams.fmss.ae
Email: super@sams.dev
Password: super123
```

### Accessing Dev Mode (Local Development Only)
```
1. Set NODE_ENV=development (not production)
2. Start server: node server/index.js
3. Press Ctrl+Shift+D on login page
4. Click quick-login button
```

### Restarting Everything
```bash
sudo systemctl restart fmss-sams
sudo systemctl restart caddy
# Wait 5 seconds for services to stabilize
sudo systemctl status fmss-sams caddy
```

---

## 📞 Support & Documentation

- **GitHub Repo:** https://github.com/mevijaynair/sams
- **Main Deployment Guide:** DEPLOY.md
- **Architecture Overview:** DOCUMENTATION/00_FOUNDATION/
- **Bug Reports:** BUG_REPORT.md
- **Project Roadmap:** DOCUMENTATION/00_FOUNDATION/ROADMAP.md

---

**This file should be committed to the repo and updated whenever infrastructure changes.**
