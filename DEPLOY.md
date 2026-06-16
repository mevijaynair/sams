# SAMS Production Deployment — wearefmss.com

This guide covers deploying SAMS to **wearefmss.com** with email-based password reset, secure auth, and subdomains for your other projects.

**Timeline:** ~30 minutes (DNS propagation: 24–48 hours)

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

Update your domain registrar (wearefmss.com) with:

```
Type    Name              Value
A       @                 <your-server-ip>
A       www               <your-server-ip>
A       footballai        <your-server-ip>  (for other projects)
A       fmss              <your-server-ip>
A       admin             <your-server-ip>
CNAME   *.wearefmss.com   wearefmss.com     (wildcard for future subdomains)
```

Also add Resend's DNS records for email verification (Resend shows them in the domain setup).

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
# Wait for DNS to propagate (~5–30 minutes; check with `dig wearefmss.com`)

# Open a browser and go to https://wearefmss.com
# You should see the SAMS login page (HTTPS with a valid certificate)

# Log in with the super-admin account:
# Email: admin@wearefmss.com
# Password: TempPassword123!

# On first login, click "Forgot password?" to reset to a strong password
# Check your email (Resend) for the reset link
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

## Subdomains for Other Projects

Edit the Caddyfile to add reverse proxies for your Football AI, FMSS, etc.:

```
footballai.wearefmss.com {
  reverse_proxy localhost:3001  # wherever your Football AI app runs
  encode gzip
}
```

Then restart Caddy: `sudo systemctl restart caddy`

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
