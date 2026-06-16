# FMSS Multi-Project Deployment — fmss.ae

This guide covers deploying your **FMSS Football Club ecosystem** to **fmss.ae** with specialized subdomains:

- **fmss.ae** → FMSS Football Club site (main public/admin site)
- **sams.fmss.ae** → SAMS (Sports Academy Management — for team/academy management)
- **quiz.fmss.ae** → Annual Day Quiz (team-based multi-round quiz with live scoring)
- **contracts.fmss.ae** → FMSS Contracts (football contract & fee management)

**Timeline:** ~1 hour (all four apps; DNS propagation: 24–48 hours)

---

## Prerequisites

- [ ] **Server:** Linux VPS (Ubuntu 22.04 LTS recommended) with SSH access and ~1GB disk space
- [ ] **Domain:** wearefmss.com with DNS control (you'll create A records)
- [ ] **Email:** Resend account (free tier: resend.com) with a verified sender domain
- [ ] **Tools:** `git`, `node` (v24+), `npm`, `caddy` (installed on the server)

---

## Step 1: Prepare the Server

```bash
# SSH into your VPS
ssh root@<your-server-ip>

# Update system packages
apt update && apt upgrade -y

# Install Node.js 24 + npm
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
apt install -y nodejs

# Install Caddy (auto-HTTPS reverse proxy)
apt install -y caddy

# Create a dedicated user for SAMS
useradd -m -s /bin/bash sams
mkdir -p /opt/sams /data
chown sams:sams /opt/sams /data
chmod 750 /data  # restrict DB access

# Install git
apt install -y git
```

---

## Step 2: Clone & Install SAMS

```bash
# As the sams user
su - sams

# Clone the repository (adjust URL)
git clone https://github.com/your-org/SAMS.git /opt/sams
cd /opt/sams

# Install dependencies
npm ci --only=production

# Verify it starts (should fail without .env, which is expected)
node server/index.js &
sleep 2 && pkill -f "node server"
```

---

## Step 3: Configure Environment

```bash
# Copy the example env and fill in your secrets
cp .env.example .env

# Edit .env with your actual values:
# - JWT_SECRET: generate via `openssl rand -hex 32`
# - SAMS_DB_PATH: /data/sams.db
# - RESEND_API_KEY: from https://resend.com (after verifying sender domain)
# - EMAIL_FROM: e.g. SAMS <no-reply@wearefmss.com>
# - APP_URL: https://wearefmss.com

nano /opt/sams/.env
```

**Getting your Resend API key:**
1. Sign up at https://resend.com (free tier is fine)
2. Go to **Integrations** → **API Keys** → Create one, copy it
3. Go to **Domains** → Add your domain (wearefmss.com)
4. Verify ownership via DNS TXT record (Resend shows the exact record)
5. Once verified, set `RESEND_API_KEY` and `EMAIL_FROM` in `.env`

---

## Step 4: Set Up the Database

```bash
# As the sams user
cd /opt/sams

# Initialize the database (migrations run automatically)
node server/index.js &
sleep 3 && pkill -f "node server"

# Verify the DB was created
ls -lh /data/sams.db
```

---

## Step 5: Create the Initial Super-Admin Account

```bash
# Connect to the SQLite database
sqlite3 /data/sams.db

# In the SQLite prompt:
-- Generate a strong password hash (we'll use a temporary one)
-- The user will reset it on first login via the "Forgot password" flow

-- Copy-paste these commands:
INSERT INTO users (id, tenant_id, name, email, password_hash, role, active, created_at)
VALUES (
  'u_super_prod',
  NULL,
  'FMSS Admin',
  'admin@wearefmss.com',
  '$2a$10$8dyfJFaQ8E.rP.L6YLx.h.dXwJY4iI5uxfQZSjKLLCdxgMWI7XPu2',  -- hash of 'TempPassword123!' (change immediately)
  'super_admin',
  1,
  datetime('now')
);

.quit
```

**CRITICAL:** After logging in with the temporary password, immediately reset it to a strong, unique one via the "Forgot password" flow (don't reuse it).

---

## Step 6: Configure DNS

Update your domain registrar (fmss.ae) with:

```
Type    Name              Value
A       @                 <your-server-ip>          (FMSS Football Club site)
A       www               <your-server-ip>          (redirects to fmss.ae)
A       sams              <your-server-ip>          (SAMS — team/academy management)
A       quiz              <your-server-ip>          (Annual Day Quiz)
A       contracts         <your-server-ip>          (FMSS Contracts — fee management)
CNAME   *.fmss.ae         fmss.ae                   (wildcard for future subdomains)
```

Also add Resend's DNS records for email verification (Resend shows them in the domain setup).

**Verify DNS is live:**
```bash
dig fmss.ae             # should show your server IP (club site)
dig sams.fmss.ae       # should resolve via wildcard
dig quiz.fmss.ae       # should resolve via wildcard
dig contracts.fmss.ae  # should resolve via wildcard
```

---

## Step 7: Set Up Caddy Reverse Proxy

```bash
# As root
sudo systemctl stop caddy  # if running

# Copy the Caddyfile to Caddy's config directory
sudo cp /opt/sams/Caddyfile /etc/caddy/Caddyfile

# Give Caddy permission to manage certificates (auto-HTTPS)
sudo chown root:root /etc/caddy/Caddyfile
sudo chmod 644 /etc/caddy/Caddyfile

# Test the Caddyfile syntax
sudo caddy validate --config /etc/caddy/Caddyfile

# Start Caddy
sudo systemctl start caddy
sudo systemctl enable caddy  # auto-start on reboot

# Verify it's running
sudo systemctl status caddy
sudo tail -f /var/log/caddy/access.log  # watch requests
```

---

## Step 8: Set Up SAMS as a Systemd Service

```bash
# As root
sudo cp /opt/sams/sams.service /etc/systemd/system/sams.service

# Reload systemd
sudo systemctl daemon-reload

# Start SAMS
sudo systemctl start sams
sudo systemctl enable sams  # auto-start on reboot

# Verify it's running
sudo systemctl status sams
sudo journalctl -u sams -f  # watch logs
```

---

## Step 9: Test the Deployment

```bash
# Wait for DNS to propagate (~5–30 minutes; check with `dig sams.fmss.ae`)

# Open a browser and test all apps:

# 1. FMSS Football Club (main site)
https://fmss.ae
# Should load your FMSS club site (from your other chat)

# 2. SAMS (team/academy management)
https://sams.fmss.ae
# Should show the SAMS login page (HTTPS with a valid certificate)
# Log in with super-admin:
# Email: admin@fmss.ae (or the email you set in the DB)
# Password: TempPassword123!
# On first login, click "Forgot password?" to reset to a strong password
# Check your email (Resend) for the reset link

# 3. Quiz (Annual Day)
https://quiz.fmss.ae
# Should load the quiz API (JSON response from /api/health)

# 4. Contracts (Fee Management)
https://contracts.fmss.ae
# Should load the contracts API (JSON response from /api/health)
```

---

## Step 10: Verify Email Sending

```bash
# In SAMS, go to Staff & Roles → Create a new user → Save
# They should receive an invite email with a password-setup link

# Check Resend dashboard for delivery status:
# https://resend.com/emails
```

---

## Step 10: Deploy Your Other Projects

The Caddyfile is already configured with reverse proxies for all subdomains. Deploy in this order:

### 10a: Deploy FMSS Football Club Site (fmss.ae — main domain)

**Architecture:**
- Your club's main public-facing site (from your other chat)
- React/Vue dashboard for club management, events, news, etc.
- Can integrate with SAMS for team data

**Steps:**
```bash
# Clone your FMSS club repo to /opt/fmss-club
git clone <your-club-repo> /opt/fmss-club
cd /opt/fmss-club

# Install & configure
npm install
cp .env.example .env
nano .env  # set PORT=8000 (or your configured port)

# Create a systemd service (or use your existing one)
# PORT=8000 (Caddy routes fmss.ae → localhost:8000)

sudo systemctl start fmss-club
sudo systemctl enable fmss-club
```

**Caddyfile:** Already configured to reverse-proxy `fmss.ae → localhost:8000`  
(Update the port in Caddyfile if your club app uses a different port)

---

### 10b: Deploy the Annual Day Quiz (quiz.fmss.ae)

**Architecture:**
- Frontend: React/Vue (or vanilla JS if lightweight)
- Backend: Node.js + Express (or your preferred stack)
- Database: SQLite or PostgreSQL
- Key features: Multi-round quiz, team-based scoring, real-time leaderboard, mobile-friendly

**Steps:**
```bash
# Clone your quiz app repo to /opt/quiz
git clone <your-quiz-repo> /opt/quiz
cd /opt/quiz

# Install & configure
npm install
cp .env.example .env
nano .env  # set your quiz DB path, ports, etc.

# Create a quiz-app systemd service (similar to sams.service)
# PORT=3001 (Caddy routes quiz.fmss.ae → localhost:3001)

sudo systemctl start quiz
sudo systemctl enable quiz
```

**Caddyfile:** Already configured to reverse-proxy `quiz.fmss.ae → localhost:3001`

---

### 10c: Deploy FMSS Contracts (contracts.fmss.ae)

**Architecture:**
- Frontend: React/Vue dashboard for contract management
- Backend: Node.js + Express with contract/payment tracking
- Database: SQLite or PostgreSQL (integrate with SAMS data if shared academies)
- Key features: Contract templates, signing workflows, fee tracking, payment history

**Steps:**
```bash
# Clone your contracts app repo to /opt/fmss-contracts
git clone <your-contracts-repo> /opt/fmss-contracts
cd /opt/fmss-contracts

# Install & configure
npm install
cp .env.example .env
nano .env  # set your contracts DB path, ports, etc.

# Create a contracts systemd service
# PORT=3002 (Caddy routes contracts.fmss.ae → localhost:3002)

sudo systemctl start fmss-contracts
sudo systemctl enable fmss-contracts
```

**Caddyfile:** Already configured to reverse-proxy `contracts.fmss.ae → localhost:3002`

---

### 10d: Verify All Four Apps

```bash
# Open in browser:
https://fmss.ae              # FMSS Club site (should load)
https://sams.fmss.ae        # SAMS (should load)
https://quiz.fmss.ae        # Annual Day Quiz (should load)
https://contracts.fmss.ae   # Contracts app (should load)

# Check logs:
sudo journalctl -u fmss-club -f        # Club site
sudo journalctl -u sams -f             # SAMS
sudo journalctl -u quiz -f             # Quiz
sudo journalctl -u fmss-contracts -f   # Contracts

# Verify Caddy routing:
sudo tail -f /var/log/caddy/access.log
```

---

## Adding More Subdomains (Future Projects)

The Caddyfile wildcard (`*.fmss.ae → fmss.ae` DNS) means any new subdomain automatically works with Caddy. To add project 4, 5, etc.:

1. **Create the app** on a new port (3003, 3004, etc.)
2. **Add to Caddyfile:**
   ```
   myproject.fmss.ae {
     reverse_proxy localhost:3003
     encode gzip
   }
   ```
3. **Restart Caddy:** `sudo systemctl restart caddy`
4. **DNS:** No changes needed (wildcard covers it)

---

## Monitoring & Maintenance

### Logs
```bash
# SAMS app logs
sudo journalctl -u sams -f --since "10 minutes ago"

# Caddy/HTTPS logs
sudo journalctl -u caddy -f

# SQLite database health
sudo sqlite3 /data/sams.db "SELECT COUNT(*) FROM users;"
```

### Backups (Daily)
```bash
# Add to crontab (crontab -e as root):
0 2 * * * tar -czf /backups/sams-$(date +\%Y-\%m-\%d).tar.gz /data/sams.db

# Or just copy the DB file to cloud storage:
aws s3 cp /data/sams.db s3://my-backup-bucket/sams.db
```

### Reset a User's Password (If Forgotten)
```bash
# As root, force-reset a user's password to a temporary one
sqlite3 /data/sams.db "UPDATE users SET password_hash = '\$2a\$10\$...' WHERE email = 'user@example.com';"

# They can then use "Forgot password?" to set a new one
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **DNS not resolving** | Wait 24–48 hours; check with `dig wearefmss.com` or `nslookup` |
| **HTTPS certificate error** | Restart Caddy: `sudo systemctl restart caddy`; check `/var/log/caddy/` |
| **Login fails** | Check user `active=1` in DB; verify JWT_SECRET is set in `.env` |
| **Emails not sending** | Check `RESEND_API_KEY` is valid; verify sender domain is verified in Resend |
| **Database locked** | Restart SAMS: `sudo systemctl restart sams`; check for multiple processes |

---

## Credentials Summary

Save these securely (password manager, not plain text):

```
SAMS Admin
Email: admin@wearefmss.com
Password: <your-strong-password-set-via-forgot-password-flow>

JWT Secret: <from .env>
Resend API Key: <from .env>
Database: /data/sams.db (on the server)
```

---

## Next Steps

1. **Invite staff:** Create users in Staff & Roles; they'll get setup emails
2. **Create academies:** Go to Tenants (super-admin view); add your sports academies
3. **Monitor:** Watch logs daily for the first week; set up log aggregation if needed
4. **Backup:** Schedule daily DB backups to cloud storage

---

**Questions?** Check the `.env.example` comments or file an issue on GitHub.
