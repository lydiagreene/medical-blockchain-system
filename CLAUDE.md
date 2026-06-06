# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**VerifyDoc Uganda** — a blockchain-backed medical credential issuance & verification platform. Django REST API + React SPA, with Ethereum (Sepolia) anchoring, IPFS (Pinata) storage, DeepFace biometrics, and ML fraud detection.

- **Full reference:** [`progress.md`](progress.md) — exhaustive architecture, endpoint table, every feature.
- **Setup for humans:** [`README.md`](README.md). **Deploying:** [`DEPLOYMENT.md`](DEPLOYMENT.md) (Oracle Cloud free tier).
- **Repo:** `lydiagreene/medical-blockchain-system`, branch `main`.

## Environment

- Platform: **Windows** + **PowerShell** (use PS syntax: `$env:VAR`, `$null`, `Copy-Item`). Bash is also available.
- Python **3.12**, Node **20+**. Backend on `:8000`, Vite dev server on `:5173`.

## Common commands

```bash
# Backend
python manage.py migrate
python manage.py runserver                  # http://127.0.0.1:8000
python manage.py createsuperuser            # first Admin (superuser is treated as Admin)
python manage.py test                       # Django tests

# Frontend (from frontend/)
npm install
npm run dev                                 # http://localhost:5173 (proxies /api/ to :8000)
npm run build                               # outputs to ../static/react/
npm test                                    # Vitest

# Management commands
python manage.py check_license_expiry [--dry-run]   # daily cron job
python manage.py train_fraud_model
python manage.py production_check                    # verify prod hardening before deploy
```

Both servers must run together in dev — Vite proxies `/api/` to Django.

## Architecture facts that matter

- **API base URL:** `/api/v1/`. The DRF layer lives entirely in `api/` (split across `auth_views`, `credential_views`, `biometric_views`, `admin_views`, etc.).
- **Auth = HttpOnly cookie** (`verifydoc_token`, `SameSite=Lax`). No `localStorage` token. Frontend uses `withCredentials: true`. Login is two-step: credentials → mandatory TOTP 2FA.
- **Roles:** Admin / Issuer / Verifier (`accounts.models.Role`). New users register → pending → an Admin approves. A **superuser bypasses approval and is treated as Admin** (`role = Role.ADMIN if user.is_superuser`).
- **Frontend serving:** `frontend/` builds into `static/react/`; in production `spa_view` reads the Vite manifest and WhiteNoise serves the hashed assets. The multi-stage `Dockerfile` builds React into the Django image — the app is designed to be served as **one same-origin service**.

## Critical conventions & gotchas

- **NEVER commit secrets.** `.env` is gitignored. **`.env_example` must contain placeholders only** — real keys were once pasted there and had to be scrubbed. Also gitignored: `nginx/ssl/*.pem|*.pfx|*.key`, `staticfiles/`, `install_log.txt`, `temp`.
- **Keep auth same-origin.** Because the cookie is `SameSite=Lax`, it is NOT sent on cross-site API calls. Do **not** suggest splitting the frontend (e.g. Netlify) from the backend onto a different domain without also switching the cookie to `SameSite=None; Secure` and reworking CORS (`CORS_ALLOW_CREDENTIALS`) + CSRF. The API deliberately relies on Lax + CORS instead of Django CSRF (`api/authentication.py`).
- **`/admin/` needs `CSRF_TRUSTED_ORIGINS`** (env-driven in `settings.py`) when `DEBUG=False` + HTTPS, or admin login fails CSRF.
- **DeepFace/TensorFlow is RAM-heavy** (~1 GB+ to load). Free hosts with 512 MB OOM on the face-verify endpoint — this drove the Oracle (24 GB ARM) deploy choice. On ARM, TensorFlow installs via native `aarch64` wheels.
- **External integrations no-op gracefully** when their keys are blank (`WEB3_PROVIDER_URL`, `PINATA_*`, `AT_*`) — the app runs locally with none of them.
- **Settings are env-driven** via `python-decouple`'s `config()` reading `.env`. Add new config the same way; document it in `.env_example` (placeholder) and the env table in `progress.md`/`README.md`.

## Conventions when editing

- Match existing code style; the API is split into small focused view modules under `api/`.
- After meaningful changes, update **`progress.md`** (and `README.md`/`DEPLOYMENT.md` if setup/deploy changes).
- Git: commit/push only when asked. Default branch `main`. Watch for CRLF warnings on Windows — they're harmless line-ending normalization.
