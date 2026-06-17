# VerifyDoc Uganda

> Blockchain-backed medical credential issuance & verification platform — Django REST API + React SPA, with on-chain proofs, IPFS document storage, biometric face verification, and ML fraud detection.

VerifyDoc lets **institutions issue** tamper-proof professional licenses, **verifiers confirm** their authenticity instantly (publicly or via biometric match), and **admins govern** the whole system with a full audit trail. Each credential is anchored on the Ethereum Sepolia testnet and its documents/photos are pinned to IPFS, so a license can be verified independently of any single database.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [First Admin & User Roles](#first-admin--user-roles)
- [Scheduled / Management Commands](#scheduled--management-commands)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Production Deployment (Docker)](#production-deployment-docker)
- [Project Layout](#project-layout)
- [Security Notes for Collaborators](#security-notes-for-collaborators)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Role-based portal** — Admin, Issuer, and Verifier dashboards (React SPA).
- **Blockchain anchoring** — issue / verify / revoke credentials on Ethereum Sepolia.
- **IPFS storage** — credential documents and practitioner photos pinned via Pinata.
- **Biometric verification** — DeepFace face match with liveness detection.
- **Public verification** — anyone can verify a license number with no login.
- **ML fraud detection** — scikit-learn model flags suspicious credentials.
- **PDF certificates** — generated with an embedded QR code that links to the public verify page.
- **Credential lifecycle** — renewal (with history) and revocation (with reason).
- **Notifications** — email + Africa's Talking SMS on issue / revoke / expiry.
- **Hardened auth** — mandatory TOTP 2FA, HttpOnly-cookie sessions, account lockout, full audit log.

See [`progress.md`](progress.md) for the exhaustive feature/endpoint reference.

---

## Architecture

```
React SPA (Vite)  ──HTTP (HttpOnly cookie)──►  Django REST API (/api/v1/)
                                                      │
        ┌─────────────────────┬───────────────┬──────┴────────┬─────────────┐
        ▼                     ▼               ▼                ▼             ▼
  Ethereum Sepolia       IPFS (Pinata)    DeepFace        PostgreSQL/    Africa's Talking
  (on-chain proofs)      (docs/photos)    (biometrics)    SQLite (data)   (SMS) + Email
```

- **Auth flow:** credentials → TOTP 2FA → server sets an `HttpOnly SameSite=Lax` cookie (`verifydoc_token`). No token in `localStorage`.
- **API base URL:** `/api/v1/` (Vite proxies it in dev; Django serves it directly in prod).
- **Frontend build:** `frontend/` builds into `static/react/`; in production `spa_view` reads the Vite manifest and serves hashed assets via WhiteNoise.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, Django 4.2, Django REST Framework 3.14 |
| Frontend | React 19, Vite, Tailwind CSS v3, Framer Motion, Recharts |
| Database | SQLite (dev) / PostgreSQL 16 (prod) |
| Blockchain | web3.py, Ethereum Sepolia (via Infura) |
| Storage | IPFS via Pinata |
| Biometrics / ML | DeepFace, OpenCV, scikit-learn |
| Notifications | Django email (SMTP/console), Africa's Talking SMS |
| Auth | pyotp (TOTP 2FA), DRF token auth (HttpOnly cookie) |
| Infra | Docker, docker-compose, Nginx, Gunicorn, WhiteNoise |
| Observability | Sentry, drf-spectacular (OpenAPI) |

---

## Prerequisites

Install these before you start:

- **Python 3.12** ([download](https://www.python.org/downloads/))
- **Node.js 20+** and npm ([download](https://nodejs.org/))
- **Git**
- *(Optional, prod only)* **Docker Desktop** + **PostgreSQL 16**

You can run the **entire app locally with no external accounts** — SQLite is the default DB, emails print to the console, and SMS/blockchain/IPFS gracefully no-op when their keys are blank. To exercise the full feature set you'll want free accounts for: **Infura** (Sepolia RPC), **Pinata** (IPFS), and optionally **Africa's Talking** (SMS) and **Sentry** (errors).

---

## Quick Start (Local Development)

The app has **two parts** that run side by side: the Django backend (port **8000**) and the Vite frontend dev server (port **5173**). Open two terminals.

### 1. Clone the repo

```bash
git clone https://github.com/lydiagreene/medical-blockchain-system.git
cd medical-blockchain-system
```

### 2. Backend — Django API (Terminal 1)

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows (PowerShell):
venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create your environment file from the template
cp .env_example .env          # Windows PowerShell: Copy-Item .env_example .env
# (edit .env — see "Environment Variables" below. Defaults work out of the box.)

# Apply database migrations
python manage.py migrate

# Create your first admin account
python manage.py createsuperuser

# Start the API server
python manage.py runserver      # ➜ http://127.0.0.1:8000
```

### 3. Frontend — React SPA (Terminal 2)

```bash
cd frontend
npm install
npm run dev                     # ➜ http://localhost:5173
```

### 4. Open the app

Visit **http://localhost:5173** in your browser. The Vite dev server proxies all `/api/` calls to Django on port 8000, so both must be running.

> First login walks every user through **mandatory 2FA setup** — scan the QR code with an authenticator app (Google Authenticator, Authy, etc.) and **save the backup codes** shown once.

#### Accessing from another device on your network (LAN)

The dev server binds to `0.0.0.0` (`server.host: true` in `frontend/vite.config.js`), so you can open the app from a phone or another computer on the same Wi-Fi/LAN. On startup Vite prints a **Network** URL, e.g.:

```
➜  Network: http://192.168.100.57:5173/
```

Open that URL on the other device. The Vite proxy forwards `/api/` to Django for you, which keeps the browser **same-origin** — important because the `verifydoc_token` auth cookie is `SameSite=Lax` and is only sent on same-origin requests.

Notes:
- `server.strictPort: true` means Vite **fails fast** if `5173` is already in use rather than silently switching ports. Stop the other process (or change the port) and rerun.
- Windows may prompt to allow Node through the firewall on first run — allow it for **private networks**.

---

## Environment Variables

All config lives in a `.env` file at the project root (never commit it — it's gitignored). Copy `.env_example` and fill in what you need. The template is fully annotated; the essentials:

| Variable | Required? | Description |
|----------|-----------|-------------|
| `SECRET_KEY` | **Yes** | Django secret. Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | Yes | `True` for dev, `False` for prod (enables all security hardening). |
| `DATABASE_URL` | Yes | `sqlite:///db.sqlite3` (dev) or `postgres://user:pass@host:5432/db` (prod). |
| `WEB3_PROVIDER_URL` | For blockchain | Infura Sepolia RPC endpoint. |
| `DEPLOYER_ADDRESS` / `DEPLOYER_PRIVATE_KEY` | For blockchain | Wallet that signs on-chain writes. **Never commit a real key.** |
| `CONTRACT_ADDRESS` | For blockchain | Deployed smart-contract address. |
| `PINATA_API_KEY` / `PINATA_SECRET_KEY` | For IPFS | Pinata upload credentials. |
| `EMAIL_BACKEND` | Yes | Defaults to console (prints emails to the terminal). Switch to SMTP/Mailtrap/Gmail for real mail. |
| `AT_USERNAME` / `AT_API_KEY` | For SMS | Africa's Talking. Leave blank to disable SMS. |
| `SITE_URL` / `FRONTEND_URL` | Yes | Base URLs used in email links and QR codes. |
| `SENTRY_DSN` | Optional | Error tracking. Leave blank to disable. |

> ⚠️ **`.env_example` must only ever contain placeholders** — no real keys. The real values belong in your local `.env` (gitignored).

---

## Running the App

| What | Command | URL |
|------|---------|-----|
| Backend API | `python manage.py runserver` | http://127.0.0.1:8000 |
| Frontend (HMR) | `cd frontend && npm run dev` | http://localhost:5173 |
| Frontend prod build | `cd frontend && npm run build` | outputs to `static/react/` |
| Django admin | — | http://127.0.0.1:8000/admin/ |
| API docs (Swagger) | — | http://127.0.0.1:8000/api/docs/ |

---

## First Admin & User Roles

- The **superuser** you create with `createsuperuser` is your first **Admin**.
- New users **register** at `/register` and start in a **pending** state — an Admin must **approve** them from the *Pending Users* page before they can log in.
- Roles:
  - **Admin** — approve/reject users, manage institutions, view audit log & fraud dashboard, revoke credentials.
  - **Issuer** — issue, renew, and manage credentials for their institution.
  - **Verifier** — look up credentials and run biometric face verification.

---

## Scheduled / Management Commands

```bash
# Auto-expire overdue credentials and send 30/7/1-day expiry warnings (run daily)
python manage.py check_license_expiry
python manage.py check_license_expiry --dry-run     # preview only

# Train the ML fraud-detection model
python manage.py train_fraud_model

# Verify production config is correctly hardened (run before deploying)
python manage.py production_check
```

Schedule `check_license_expiry` daily via **Windows Task Scheduler** or **cron** (e.g. `0 7 * * *`).

---

## Testing

```bash
# Backend (Django / DRF)
python manage.py test

# Frontend (Vitest + React Testing Library)
cd frontend
npm test                  # single run
npm run test:watch        # watch mode
npm run test:coverage     # with coverage
```

---

## API Documentation

Interactive, auto-generated docs (drf-spectacular) once the backend is running:

- **Swagger UI:** http://127.0.0.1:8000/api/docs/
- **ReDoc:** http://127.0.0.1:8000/api/redoc/
- **OpenAPI schema:** http://127.0.0.1:8000/api/schema/

A full endpoint table also lives in [`progress.md`](progress.md).

---

## Production Deployment (Docker)

The repo ships a multi-stage `Dockerfile` (Node 20 builds React → Python 3.12 runs Django/Gunicorn) and a `docker-compose.yml` wiring Postgres + Django + Nginx.

> 📘 **Deploying for free?** See **[`DEPLOYMENT.md`](DEPLOYMENT.md)** for a complete step-by-step guide to hosting the whole stack on an **Oracle Cloud Always Free** VM (handles the heavy DeepFace/TensorFlow workload at no cost), including HTTPS via Let's Encrypt and the daily expiry cron.

```bash
# 1. Create a production .env (DEBUG=False, real DATABASE_URL, POSTGRES_PASSWORD, secrets, CORS_ALLOWED_ORIGINS)
# 2. Place TLS certs at nginx/ssl/fullchain.pem and nginx/ssl/privkey.pem  (NOT committed — provide at deploy time)
# 3. Build and start everything
docker compose up --build -d

# View logs
docker compose logs -f django

# Run a management command inside the container
docker compose exec django python manage.py check_license_expiry
```

| Service | Image | Port |
|---------|-------|------|
| `db` | postgres:16-alpine | internal 5432 |
| `django` | project Dockerfile (Gunicorn) | internal 8000 |
| `nginx` | nginx:alpine | 80 → 443 |

The entrypoint waits for the DB, runs migrations, collects static files, and starts Gunicorn automatically.

---

## Project Layout

```
medical-blockchain-system/
├── accounts/          Users, roles, audit log, notifications, signals, password reset
├── credentials/       Credential model, PDF/QR utils, renewal, email+SMS notifications
├── fraud_detection/   ML fraud prediction (scikit-learn)
├── biometrics/        DeepFace face comparison
├── blockchain/        Ethereum utils (issue/verify/revoke on-chain)
├── ipfs/              Pinata IPFS upload utils
├── api/               DRF REST layer — all endpoints under /api/v1/
├── verifydoc/         Django project settings, root urls, middleware, SPA view
├── templates/         Django templates (legacy portal + emails + error pages)
├── frontend/          React SPA (Vite) — see frontend/src/
├── static/react/      Vite build output (served in production)
├── docker/            entrypoint.sh
├── nginx/             nginx.conf (SSL keys go in nginx/ssl/, gitignored)
├── Dockerfile · docker-compose.yml
└── progress.md        Detailed architecture & feature reference
```

---

## Security Notes for Collaborators

- **Never commit secrets.** `.env`, SSL keys (`nginx/ssl/*.pem`, `*.pfx`), and logs are gitignored. `.env_example` must contain **placeholders only**.
- **Mandatory 2FA:** every account sets up TOTP on first login. Save your backup codes — an Admin can reset a lost authenticator from *Pending Users → Reset 2FA*.
- **Auth is cookie-based** (HttpOnly). The frontend sends `withCredentials: true`; there is no bearer token in `localStorage`.
- **Rate limits** are enforced on login, 2FA, password reset, public verify, and face verify endpoints.
- When `DEBUG=False`, Django enforces HTTPS redirects, HSTS, secure cookies, and the security-headers middleware (CSP, etc.).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend can't reach the API | Make sure **both** servers are running (Django :8000 + Vite :5173). Vite proxies `/api/` to Django. |
| `deepface` / `tensorflow` install is slow or fails | It pulls large ML wheels — ensure Python 3.12 and a recent `pip` (`pip install -U pip`). On Apple Silicon you may need `tensorflow-macos`. |
| `psycopg2` build error (local dev) | You don't need Postgres locally — keep `DATABASE_URL=sqlite:///db.sqlite3`. |
| 2FA QR code won't scan | Use the manual `otpauth` key shown on the setup page, or have an Admin reset 2FA. |
| Blockchain/IPFS/SMS calls do nothing | Expected when their keys are blank — fill in `WEB3_PROVIDER_URL` / `PINATA_*` / `AT_*` in `.env` to enable. |
| Emails not arriving | Default backend prints them to the Django terminal. Set an SMTP backend in `.env` for real delivery. |

---

*Built for the VerifyDoc Uganda platform. For the full technical reference, see [`progress.md`](progress.md).*
