# Deploying VerifyDoc on Oracle Cloud (Always Free)

This guide deploys the **entire app** — React SPA + Django API + PostgreSQL + Nginx — as a single Docker Compose stack on an **Oracle Cloud Always Free** ARM VM. This tier is free *forever* and gives you up to **4 CPUs / 24 GB RAM**, which is the only no-compromise free option that comfortably runs the DeepFace/TensorFlow biometrics.

**End result:** `https://yourdomain` serving the full app, HTTPS via Let's Encrypt, auto-restarting containers, daily license-expiry cron.

> **Why one service (not Netlify + separate backend)?** The auth cookie is `SameSite=Lax`, so it is *not* sent on cross-site API calls. Serving React and the API from the **same origin** (Django via Nginx) makes auth "just work" with no CORS/CSRF surgery. The repo's Dockerfile already builds React into the Django image for exactly this.

---

## What you need first

- An **Oracle Cloud** account (free; requires a card for identity verification — **not charged** on Always Free resources).
- A **domain or free subdomain**. If you don't own one, use **[DuckDNS](https://www.duckdns.org)** (free) — e.g. `verifydoc.duckdns.org`. You need a real hostname for HTTPS; raw IPs can't get a Let's Encrypt cert easily.
- The accounts whose keys go in `.env`: **Infura** (Sepolia RPC), **Pinata** (IPFS), optionally **Africa's Talking** (SMS), **Sentry**.
- An SSH key pair (the Oracle console can generate one for you).

---

## Step 1 — Create the Always Free ARM VM

1. Oracle Cloud Console → **Compute → Instances → Create instance**.
2. **Image & shape:**
   - Image: **Canonical Ubuntu 22.04** (ARM/aarch64).
   - Shape: **Ampere → VM.Standard.A1.Flex**. Set **2 OCPU / 12 GB RAM** (or 4/24 — both are within Always Free).
3. **Networking:** keep "Create new VCN" and **assign a public IPv4**.
4. **SSH keys:** upload your public key (or download the generated key — keep it safe).
5. Click **Create**. Note the **public IP** once it's running.

> 🛟 **"Out of capacity" error?** The free A1 ARM shape is popular and often full. Retry in a different **Availability Domain**, retry later, or script the retry. This is the single most common Oracle friction point — keep trying.

---

## Step 2 — Open ports 80 & 443 (two places!)

Oracle blocks traffic in **two** independent layers. You must open both.

**A. VCN Security List (cloud firewall):**
- Console → **Networking → Virtual Cloud Networks → [your VCN] → Security Lists → Default Security List → Add Ingress Rules**:
  - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **80**
  - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **443**

**B. The instance's own iptables** (Oracle Ubuntu images ship with a restrictive firewall):

```bash
# SSH in first:
ssh -i /path/to/your_key ubuntu@YOUR_PUBLIC_IP

# Allow HTTP/HTTPS and persist the rule
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## Step 3 — Point your domain at the VM

- **Own domain:** create an **A record** for `yourdomain.com` → `YOUR_PUBLIC_IP` (and `www` if you want it).
- **DuckDNS (free):** create a subdomain on duckdns.org and set its IP to `YOUR_PUBLIC_IP`.

Verify it resolves before continuing:
```bash
ping -c1 yourdomain.com   # should show YOUR_PUBLIC_IP
```

---

## Step 4 — Install Docker on the VM

```bash
sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu        # run docker without sudo
newgrp docker                          # apply group now (or log out/in)
docker --version && docker compose version
```

---

## Step 5 — Get the code

```bash
sudo apt-get install -y git
git clone https://github.com/lydiagreene/medical-blockchain-system.git
cd medical-blockchain-system
```

---

## Step 6 — Create the production `.env`

```bash
cp .env_example .env
nano .env
```

Set these for production (replace `yourdomain.com`; same-origin means `SITE_URL` and `FRONTEND_URL` are identical):

```ini
# Core
SECRET_KEY=<paste a fresh key>      # python3 -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Same-origin URLs (HTTPS)
SITE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database (used by docker-compose to provision Postgres)
POSTGRES_PASSWORD=<a long random password>

# Blockchain / IPFS / SMS / email — your real keys
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/<your-infura-id>
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=<your key>     # NEVER commit this file
CONTRACT_ADDRESS=0x...
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
# Real email (so verification/reset links actually send):
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=<gmail app password>
EMAIL_USE_TLS=True
```

> `DATABASE_URL` is overridden by `docker-compose.yml` to point at the bundled Postgres — you don't set it here.

---

## Step 7 — Set your domain in Nginx

Edit `nginx/nginx.conf` and replace the hardcoded host:

```bash
nano nginx/nginx.conf
# change:  server_name verifydoc.ug www.verifydoc.ug;
# to:      server_name yourdomain.com www.yourdomain.com;
```

---

## Step 8 — Get a free TLS certificate (Let's Encrypt)

Nginx needs `nginx/ssl/fullchain.pem` and `nginx/ssl/privkey.pem`. Mint them with Certbot in **standalone** mode (port 80 must be free, so do this *before* starting the stack):

```bash
mkdir -p nginx/ssl

docker run --rm -p 80:80 \
  -v "$PWD/letsencrypt:/etc/letsencrypt" \
  certbot/certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com \
  --email you@example.com --agree-tos --no-eff-email

# Copy the issued cert into the path Nginx expects:
sudo cp letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
sudo cp letsencrypt/live/yourdomain.com/privkey.pem   nginx/ssl/privkey.pem
sudo chown $USER:$USER nginx/ssl/*.pem
```

> These cert files are **gitignored** (`nginx/ssl/*.pem`) — they live only on the server. ✅

---

## Step 9 — Build and launch 🚀

```bash
docker compose up --build -d
```

First build takes a while — it compiles the React app and installs TensorFlow/DeepFace (ARM `aarch64` wheels download natively on the VM). Watch progress:

```bash
docker compose logs -f django
```

When you see **"Starting Gunicorn…"**, it's live. The entrypoint auto-runs migrations and `collectstatic`.

---

## Step 10 — Create your admin & smoke-test

```bash
# Create the first Admin (a superuser is treated as Admin and skips approval)
docker compose exec django python manage.py createsuperuser

# Optional: confirm production hardening
docker compose exec django python manage.py production_check
```

Now open **https://yourdomain.com** — you should get the landing page over HTTPS, be able to log in (you'll set up 2FA on first login), and reach **https://yourdomain.com/admin/** and **/api/docs/**.

---

## Step 11 — Daily license-expiry cron

Run the expiry job once a day via the host crontab:

```bash
crontab -e
# add (runs 07:00 daily):
0 7 * * * cd /home/ubuntu/medical-blockchain-system && /usr/bin/docker compose exec -T django python manage.py check_license_expiry >> /home/ubuntu/expiry.log 2>&1
```

---

## Certificate renewal (every ~60 days)

Let's Encrypt certs last 90 days. Renew and reload Nginx:

```bash
docker compose stop nginx
docker run --rm -p 80:80 -v "$PWD/letsencrypt:/etc/letsencrypt" \
  certbot/certbot renew
sudo cp letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
sudo cp letsencrypt/live/yourdomain.com/privkey.pem   nginx/ssl/privkey.pem
docker compose start nginx
```

You can wrap those four lines in a script and add a monthly crontab entry.

---

## Updating the app

```bash
cd ~/medical-blockchain-system
git pull
docker compose up --build -d        # rebuilds and restarts changed services
```

---

## Maintenance cheatsheet

```bash
docker compose ps                    # status
docker compose logs -f django        # app logs
docker compose restart django        # restart app only
docker compose down                  # stop everything (data persists in volumes)
docker compose exec django python manage.py <command>   # any manage.py command

# Backup the database
docker compose exec -T db pg_dump -U verifydoc verifydoc > backup_$(date +%F).sql
```

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Site unreachable in browser | Both firewall layers must be open — re-check **VCN Security List** *and* **iptables** (Step 2). |
| `CSRF verification failed` on `/admin/` login | `CSRF_TRUSTED_ORIGINS` must include your `https://yourdomain.com` (set in `.env`). |
| CSS/admin unstyled, `/static/` 404s | Ensure the `django` service mounts `static_data:/app/staticfiles` (already set in `docker-compose.yml`); `collectstatic` runs on container start. |
| Login works but every call 401s | You split frontend/backend onto different domains — the `SameSite=Lax` cookie won't cross sites. Keep it same-origin (this guide does). |
| `django` container OOM-killed during face verify | Give the VM ≥ 12 GB (DeepFace/TensorFlow is heavy). Always Free A1 allows up to 24 GB — bump the shape. |
| TensorFlow wheel fails to install | Confirm the VM is **ARM/aarch64 Ubuntu 22.04** and you're building **on the VM** (so pip pulls native `aarch64` wheels). |
| Cert issuance fails | DNS A record must point at the VM IP and **port 80 must be free** (stop the stack first). Verify with `ping yourdomain.com`. |
| Blockchain/IPFS/SMS do nothing | Their keys are blank in `.env` — fill them in to enable. |

---

*For the architecture and feature reference, see [`README.md`](README.md) and [`progress.md`](progress.md).*
