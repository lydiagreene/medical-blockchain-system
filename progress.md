# VerifyDoc Uganda — Project Progress

**Last updated:** 2026-05-21  
**Stack:** Django 4.2.7 · DRF 3.14.0 · React 19 · Vite 8 · Tailwind CSS v3 · Framer Motion · Recharts · Ethereum (Sepolia) · IPFS/Pinata · DeepFace · Africa's Talking

---

## Architecture

```
medical-blockchain-system/
├── accounts/          Users, roles, audit log, notifications, signals, password reset
├── credentials/       Credential model, PDF/QR utils, renewal, email+SMS notifications
├── fraud_detection/   ML fraud prediction (scikit-learn)
├── biometrics/        DeepFace face comparison (face_utils.py)
├── blockchain/        Ethereum utils (Sepolia, issue/verify/revoke on-chain)
├── ipfs/              Pinata IPFS upload utils
├── api/               DRF REST layer — all endpoints at /api/v1/
│   ├── views.py               credential list/detail/revoke/public_verify
│   ├── auth_views.py          login, register, me, update, stats, password reset, 2FA
│   ├── biometric_views.py     verify-face (DeepFace)
│   ├── credential_views.py    renew, certificate PDF, blockchain status
│   ├── admin_views.py         pending users, approve/reject/unlock, audit log, fraud, institutions
│   ├── authentication.py      ExpiringTokenAuthentication + CookieTokenAuthentication
│   ├── serializers.py
│   ├── throttles.py           per-endpoint rate-limit classes
│   └── urls.py
├── verifydoc/         Django project settings + root urls + views (spa_view)
│   └── middleware.py          SecurityHeadersMiddleware (CSP, Referrer-Policy, etc.)
├── templates/         Django HTML templates (legacy portal + error pages)
├── static/react/      Vite build output (JS/CSS bundles + .vite/manifest.json)
├── docker/            entrypoint.sh (wait-for-db, migrate, collectstatic, gunicorn)
├── nginx/             nginx.conf (SSL, static/media, proxy to gunicorn)
├── frontend/          React SPA (Vite)
│   └── src/
│       ├── api/           axios client (HttpOnly cookie, withCredentials) + endpoint wrappers
│       ├── components/    Layout, StatCard, MiniChart, WebcamCapture, StatusBadge,
│       │                  ProtectedRoute, EmptyState, NotificationBell, CommandPalette,
│       │                  ErrorBoundary
│       ├── context/       AuthContext, ToastContext, ThemeContext
│       ├── hooks/         useDocumentTitle
│       ├── utils/         date.js (fmtDate, fmtDateTime, relativeTime)
│       └── pages/         all page components (see table below)
├── Dockerfile         Multi-stage: Node 20 (React build) → Python 3.12 (Django)
├── docker-compose.yml db (Postgres 16) + django (Gunicorn) + nginx
└── .dockerignore
```

**Auth:** HttpOnly cookie (SameSite=Lax). `CookieTokenAuthentication` reads from `verifydoc_token` cookie. No `localStorage` token. `AuthContext` holds `user` + `signIn/signOut`. Two-step login: credentials → TOTP 2FA.  
**API base URL:** `/api/v1/` (proxied in dev via Vite; served directly in production).  
**Build output:** `frontend/` → `static/react/` (WhiteNoise serves it; manifest read by `spa_view`).

---

## Backend — API Endpoints (`/api/v1/`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `auth/login/` | None | Step 1 — returns `partial_token` (requires_2fa / requires_2fa_setup) |
| POST | `auth/2fa/verify/` | None | Step 2 — TOTP code or backup code → sets HttpOnly cookie |
| POST | `auth/2fa/confirm/` | Partial | First-login 2FA setup confirmation |
| GET  | `auth/2fa/setup/` | Partial | Returns `otpauth_uri` + `qr_code` (base64 PNG) |
| POST | `auth/register/` | None | Register (pending admin approval) |
| POST | `auth/verify-email/:uid/:token/` | None | Email verification link handler |
| GET  | `auth/me/` | Cookie | Current user |
| PATCH | `auth/me/update/` | Cookie | Update profile / change password |
| POST | `auth/logout/` | Cookie | Logout (clears HttpOnly cookie) |
| POST | `auth/password-reset/` | None | Send reset email (rate-limited: 3/hr) |
| POST | `auth/password-reset-confirm/` | None | Confirm reset with uid+token |
| GET  | `stats/` | Cookie | Role-branched dashboard stats |
| GET  | `verify/<license>/` | None | Public credential lookup (rate-limited: 30/min) |
| GET/POST | `credentials/` | Cookie | List (admin=all, issuer=own) / Issue new |
| GET  | `credentials/<id>/` | Cookie | Credential detail |
| POST | `credentials/<id>/revoke/` | Cookie | Revoke with optional reason (Admin) |
| POST | `credentials/<id>/renew/` | Cookie | Renew license expiry (Issuer/Admin) |
| GET  | `credentials/<id>/certificate/` | Cookie | Download PDF certificate |
| GET  | `credentials/<id>/blockchain-status/` | Cookie | Live tx confirmations |
| POST | `biometrics/verify-face/` | Cookie | DeepFace face match (rate-limited: 20/hr) |
| GET  | `institutions/` | None | Public institution list (for register form) |
| GET/POST | `admin/institutions/` | Cookie/Admin | List + create institutions |
| PATCH/DELETE | `admin/institutions/<id>/` | Cookie/Admin | Update / deactivate institution |
| GET  | `admin/users/` | Cookie/Admin | Pending users list |
| GET  | `admin/users/all/` | Cookie/Admin | All users list |
| POST | `admin/users/<id>/approve/` | Cookie/Admin | Approve user |
| POST | `admin/users/<id>/reject/` | Cookie/Admin | Reject + delete user |
| POST | `admin/users/<id>/reset-2fa/` | Cookie/Admin | Reset user's TOTP secret |
| POST | `admin/users/<id>/unlock/` | Cookie/Admin | Unlock a locked-out account |
| GET  | `admin/audit-log/` | Cookie/Admin | Audit log (filters: actor, action, date range) |
| GET  | `admin/fraud/` | Cookie/Admin | Fraud dashboard (paginated) |

---

## Backend — Key Files

| File | Purpose |
|------|---------|
| `api/authentication.py` | `ExpiringTokenAuthentication` (rejects tokens older than `TOKEN_EXPIRY_HOURS`); `CookieTokenAuthentication` reads `verifydoc_token` HttpOnly cookie |
| `api/throttles.py` | `LoginRateThrottle` (5/min), `PasswordResetRateThrottle` (3/hr), `PublicVerifyRateThrottle` (30/min), `FaceVerifyRateThrottle` (20/hr), `TwoFactorRateThrottle` (5/5min) |
| `api/auth_views.py` | login (returns partial token), 2FA setup/verify/confirm, register, me, update_profile, stats, password_reset, password_reset_confirm, email_verify |
| `api/views.py` | credential CRUD, public_verify (with live blockchain status enrichment), base64 webcam photo handling |
| `api/biometric_views.py` | verify-face → returns `match`, `similarity_score`, `registered_photo_url` |
| `api/credential_views.py` | certificate PDF (passes `frontend_url` for QR), blockchain status, renew |
| `verifydoc/middleware.py` | `SecurityHeadersMiddleware` — sets CSP, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options` on every response |
| `credentials/pdf_utils.py` | PDF cert with QR code linking to `{FRONTEND_URL}/verify?q={license}` |
| `credentials/notifications.py` | email + SMS helpers: issued, revoked, expiry warning, expired |
| `credentials/sms_utils.py` | Africa's Talking wrapper: `normalize_phone()`, `send_sms()` (never raises) |
| `credentials/management/commands/check_license_expiry.py` | Daily: auto-expire overdue credentials, send 30/7/1-day email+SMS warnings |
| `biometrics/face_utils.py` | `verify_practitioner_face(ipfs_photo_hash, face_image_data)` via DeepFace |
| `blockchain/utils.py` | `issue_credential_on_chain`, `verify_credential_on_chain`, `revoke_credential_on_chain`, `get_tx_status` |
| `accounts/models.py` | `CustomUser` with `totp_secret`, `totp_backup_codes`, `failed_login_attempts`, `locked_until`, `email_verified`; `AuditLog.log_action()` |
| `verifydoc/views.py` | `landing_view`, `spa_view` (reads Vite manifest in production), `handler404`, `handler500` |
| `verifydoc/settings.py` | Full config: security hardening, CORS, throttle rates, AT SMS, IPFS, blockchain, FRONTEND_URL |

### DB Migrations
| Migration | Contents |
|-----------|----------|
| `accounts/0001_initial` | Base `CustomUser` model |
| `accounts/0002_audit_log` | `AuditLog` model |
| `accounts/0005_security_hardening` | `totp_backup_codes`, `failed_login_attempts`, `locked_until`, `email_verified` fields |
| `credentials/0001_initial` | Base `Credential` model |
| `credentials/0002_renewal_fields` | `last_renewed_at`, `renewal_count` fields |

### Scheduled Tasks
```bash
# Run daily (Windows Task Scheduler or Linux cron)
python manage.py check_license_expiry

# Dry-run preview
python manage.py check_license_expiry --dry-run
```

---

## Frontend — Pages & Components

### Design System
All authenticated content pages use CSS custom properties defined in `src/index.css`:

| Variable | Dark value | Light value | Usage |
|----------|-----------|------------|-------|
| `--app-card` | `#0B1527` | `#FFFFFF` | Card / panel background |
| `--app-card-bdr` | `#1A2E4A` | `#E2E8F0` | Card borders, dividers |
| `--app-text` | `#F1F5F9` | `#0F172A` | Primary text |
| `--app-sub` | `#94A3B8` | `#64748B` | Secondary text |
| `--app-muted` | `#475569` | `#94A3B8` | Muted labels, placeholders |
| `--app-input` | `#0D1A2E` | `#F8FAFC` | Input field backgrounds |
| `--app-row-hover` | `rgba(255,255,255,0.03)` | `#F8FAFC` | Table row hover |
| `--clr-accent` | `#00D4A8` | `#00B894` | Teal accent / CTA color |
| `--app-content-bg` | `#060D1F` | `#F1F5F9` | Page background |

Public-facing pages (Login, Register, Landing, PublicVerify) use their own hardcoded dark-navy theme (`#060D1F` bg) and are intentionally not theme-switched.

### Shared Components
| File | Notes |
|------|-------|
| `components/Layout.jsx` | Dark sidebar (`#06101F`), **collapsible** (64 px icon-only ↔ 232 px full), breadcrumb topbar, role badge, Ctrl+K search, theme toggle, notification bell |
| `components/StatCard.jsx` | Gradient icon cards, 8 colour themes, optional delta trend — fully dark-mode aware via CSS vars |
| `components/MiniChart.jsx` | MonthBar, TrendArea, StatusPie — custom tooltip (Recharts) |
| `components/StatusBadge.jsx` | Status pill: ACTIVE / REVOKED / EXPIRED / PENDING |
| `components/WebcamCapture.jsx` | 640×480 capture, full-width display, 3 states: idle / active / captured |
| `components/ProtectedRoute.jsx` | Role-gated route wrapper |
| `components/EmptyState.jsx` | 6 typed SVG illustrations (credentials, users, fraud, audit, institutions, search); dark-mode aware |
| `components/NotificationBell.jsx` | Admin-only; derives alerts from stats API; read state in localStorage |
| `components/CommandPalette.jsx` | Ctrl+K/⌘K; live credential search; role-filtered nav; keyboard navigation |
| `components/ErrorBoundary.jsx` | Class component; catches render errors; dark-navy fallback UI with "Refresh page" button |

### Context & Hooks
| File | Purpose |
|------|---------|
| `context/AuthContext.jsx` | HttpOnly cookie auth — no localStorage token; `signIn`, `signOut`, `user` state |
| `context/ThemeContext.jsx` | `theme` (`dark`/`light`) + `toggle()`; persisted in localStorage; sets `data-theme` on `<html>` |
| `context/ToastContext.jsx` | `useToast()` hook; success/error/warning toasts with slide-in animation; dark navy styling |
| `hooks/useDocumentTitle.js` | Sets `<title>` as `"<Page> | VerifyDoc Uganda"` per page |
| `utils/date.js` | `fmtDate`, `fmtDateTime`, `relativeTime` — pure JS, no date-fns dependency |

### Pages
| File | Route | Role | Notes |
|------|-------|------|-------|
| `pages/Landing.jsx` | `/` | Public | Dark marketing page; responsive mobile menu; AnimatedCounter; bento feature grid; comparison table; stats grid |
| `pages/Login.jsx` | `/login` | Public | **Two-step**: credentials form → TOTP 6-digit OTP boxes; role selector (Admin/Issuer/Verifier) with feature lists; backup code fallback; role-tinted glow background |
| `pages/Register.jsx` | `/register` | Public | Password strength indicator (4-segment bar); confirm password; real-time inline field validation; institution dropdown with spinner; account type selector |
| `pages/ForgotPassword.jsx` | `/forgot-password` | Public | Email form; always HTTP 200 anti-enumeration |
| `pages/ResetPassword.jsx` | `/reset-password/:uid/:token` | Public | New password + strength bar + match check |
| `pages/TwoFactorSetup.jsx` | `/2fa/setup` | Partial-auth | QR code (via `qrcode` npm); 10 one-time backup codes shown once with mandatory "I've saved them" gate |
| `pages/VerifyEmail.jsx` | `/verify-email/:uid/:token` | Public | Email verification link handler; success/error states |
| `pages/PendingApproval.jsx` | `/pending` | Public | Waiting for admin approval |
| `pages/PublicVerify.jsx` | `/verify` | Public | Animated 3-step loading; expiry chip; blockchain proof panel; practitioner photo; shareable link copy |
| `pages/Dashboard.jsx` | `/dashboard` | Any auth | Routes to role-specific sub-dashboard |
| `pages/CredentialDetail.jsx` | `/credentials/:id` | Any auth | PDF download; live blockchain confirmation check; renew form (Issuer/Admin); IPFS links; **dark-mode via CSS vars** |
| `pages/Profile.jsx` | `/profile` | Any auth | Identity card; password change; institution info |
| `pages/NotFound.jsx` | `*` | Public | 404 page |
| `pages/admin/AdminDashboard.jsx` | `/dashboard` | ADMIN | Animated stat counters; skeleton loading; 6 KPI cards; chart row; alert banners; recent credentials table |
| `pages/admin/AllCredentials.jsx` | `/admin/credentials` | ADMIN | CSV export; **single revoke via modal** (no `window.confirm`); bulk revoke with reason; checkbox select-all; pagination; **dark-mode** |
| `pages/admin/PendingUsers.jsx` | `/admin/users` | ADMIN | Pending + All Users tabs; approve/reject; Reset 2FA button; Unlock button |
| `pages/admin/Institutions.jsx` | `/admin/institutions` | ADMIN | Full CRUD; search; activate/deactivate toggle |
| `pages/admin/AuditLog.jsx` | `/admin/audit-log` | ADMIN | Filter bar (actor, action, date range); paginated; **dark-mode** |
| `pages/admin/FraudDashboard.jsx` | `/admin/fraud` | ADMIN | Risk levels; red alert cards; pulsing dot |
| `pages/issuer/IssuerDashboard.jsx` | `/dashboard` | ISSUER | Greeting; dark CTA banner; recent credentials table; charts |
| `pages/issuer/IssueCredential.jsx` | `/issuer/issue` | ISSUER | 3-panel form; webcam integrated; base64 photo → IPFS |
| `pages/issuer/IssuerCredentials.jsx` | `/issuer/list` | ISSUER | Credential list with status filter |
| `pages/verifier/VerifierDashboard.jsx` | `/dashboard` | VERIFIER | QuickVerify inline panel; stats; tool cards; **dark-mode** |
| `pages/verifier/VerifyCredential.jsx` | `/verifier/verify` | VERIFIER | License lookup; practitioner photo; blockchain proof; **animate-in result card**; **shareable copy-link button** |
| `pages/verifier/FaceVerify.jsx` | `/verifier/face-verify` | VERIFIER | Liveness detection; 3-step flow; 720×540 webcam; side-by-side live vs registered photo |

### API Wrappers (`src/api/`)
| File | Functions |
|------|-----------|
| `client.js` | axios instance, base URL `/api/v1/`, `withCredentials: true` (HttpOnly cookie), no Authorization header |
| `auth.js` | `login`, `twoFactorVerify`, `twoFactorSetup`, `register`, `me`, `updateProfile`, `getStats`, `logout`, `requestPasswordReset`, `confirmPasswordReset` |
| `credentials.js` | `listCredentials`, `getCredential`, `createCredential`, `revokeCredential`, `renewCredential`, `downloadCertificate`, `getBlockchainStatus`, `publicVerify`, `verifyFace` |
| `admin.js` | `getPendingUsers`, `getAllUsers`, `approveUser`, `rejectUser`, `resetUserTotp`, `unlockUser`, `getAuditLog`, `getFraudDashboard`, `getInstitutions`, `createInstitution`, `updateInstitution`, `deactivateInstitution` |

---

## Infrastructure & DevOps

### Docker (production)
```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f django

# Run management commands inside container
docker compose exec django python manage.py check_license_expiry
```

| Service | Image | Port |
|---------|-------|------|
| `db` | postgres:16-alpine | internal 5432 |
| `django` | project Dockerfile (Python 3.12 + Gunicorn) | internal 8000 |
| `nginx` | nginx:alpine | 80 (→ 443), 443 |

**SSL certs:** Place `fullchain.pem` + `privkey.pem` in `nginx/ssl/` (or use Certbot).  
**Secrets:** Set in `.env` file (never committed — see `.env_example`).  
**Postgres password:** `POSTGRES_PASSWORD` env var (default `verifydoc_dev` for local dev only).

### Local Development
```bash
# Backend (project root)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver        # http://127.0.0.1:8000

# Frontend (from frontend/)
npm install
npm run dev                        # http://localhost:5173 (Vite HMR)
npm run build                      # builds to ../static/react/
```

**Vite proxy:** `/api/` → `http://127.0.0.1:8000` (configured in `vite.config.js`).  
**SPA routing in prod:** `spa_view` reads `static/react/.vite/manifest.json` and injects hashed JS/CSS into `templates/react_spa.html`. In DEBUG mode it redirects to `FRONTEND_URL` (Vite dev server) so HMR still works.

---

## Security Hardening

| Layer | What's in place |
|-------|----------------|
| **HttpOnly cookies** | Auth token set as `HttpOnly SameSite=Lax` cookie on 2FA confirm; no `localStorage`; frontend uses `withCredentials` |
| **Mandatory 2FA (TOTP)** | Every user must complete 2FA setup on first login; TOTP required on every subsequent login via `pyotp` |
| **TOTP backup codes** | 10 backup codes generated at setup; hashed with `make_password`; one-time use; shown once with "I've saved them" gate |
| **Partial token** | Short-TTL HMAC-signed token bridges login→2FA step; prevents session fixation |
| **Token expiry** | `ExpiringTokenAuthentication` rejects tokens older than `TOKEN_EXPIRY_HOURS` (default 8h) |
| **Account lockout** | Locks after `LOGIN_MAX_ATTEMPTS` (default 10) failed attempts for `LOGIN_LOCKOUT_MINS` (default 15 min); Admin can unlock |
| **DRF throttling** | Login 5/min · 2FA 5/5min · Password reset 3/hr · Public verify 30/min · Face verify 20/hr · Anon 120/hr · User 1000/hr |
| **Security headers** | `SecurityHeadersMiddleware`: CSP, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` |
| **HTTPS** | Nginx forces HTTP → HTTPS redirect; HSTS 1 year with preload |
| **Django hardening** | `SECURE_CONTENT_TYPE_NOSNIFF`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` (when `DEBUG=False`) |
| **Email verification** | Verification email sent on registration; `email_verified` flag on user; link at `/verify-email/:uid/:token` |
| **Audit logging** | All auth events logged: `LOGIN_FAILED`, `LOGOUT`, `ACCOUNT_LOCKED`, `2FA_SETUP_COMPLETE`, `2FA_VERIFIED`, `TOTP_RESET`, password reset events |
| **Sentry scrubbing** | `before_send` hook strips `DEPLOYER_PRIVATE_KEY`, `totp_secret`, backup codes, passwords from error reports |
| **Password reset** | Uses Django's `default_token_generator`; always returns HTTP 200 to prevent email enumeration; clears all auth tokens on confirm |
| **CORS** | Dev: `localhost:5173` whitelisted. Prod: set `CORS_ALLOWED_ORIGINS` env var |

---

## Completed Features

### Core System
- [x] Full React SPA replacing Django template portal
- [x] Role-based dashboards (Admin / Issuer / Verifier)
- [x] Blockchain credential issuance, verification, revocation (Ethereum Sepolia)
- [x] IPFS/Pinata document + photo upload
- [x] DeepFace biometric face verification with liveness detection
- [x] ML fraud detection dashboard
- [x] Audit log with actor/action/date filters
- [x] PDF certificate generation with QR code (links to React `/verify?q=`)
- [x] Credential renewal flow with history counter
- [x] Revocation reason — stored in DB, shown in CredentialDetail and PublicVerify
- [x] Institution management — full admin CRUD, public dropdown in register form
- [x] Webcam capture in credential issuance (base64 → IPFS)
- [x] Side-by-side live vs registered photo comparison in FaceVerify
- [x] Practitioner photo display in VerifyCredential results
- [x] Africa's Talking SMS (credential issued / revoked / expiry alerts)
- [x] Daily credential expiry management command (`check_license_expiry --dry-run`)
- [x] Docker + docker-compose (multi-stage build, Postgres, Nginx, Gunicorn)
- [x] Production SPA serving (`spa_view` reads Vite manifest for hashed asset URLs)
- [x] OpenAPI / Swagger docs (`drf-spectacular`; `/api/docs/`, `/api/redoc/`)
- [x] Frontend test suite (Vitest + React Testing Library)
- [x] Sentry error tracking with credential scrubbing

### Authentication & Security
- [x] **Two-step login** — credentials → TOTP 6-digit OTP input (role-selector with feature list on left panel)
- [x] **Mandatory TOTP 2FA** — every user sets up 2FA on first login; QR code via `qrcode` npm; `pyotp` on backend
- [x] **TOTP backup codes** — 10 one-time codes shown once at setup; hashed storage; "I've saved them" confirmation gate
- [x] **HttpOnly cookie auth** — token set as `HttpOnly SameSite=Lax` cookie; no `localStorage`; frontend uses `withCredentials`
- [x] **Per-account lockout** — locks after N failed attempts; admin Unlock button; logged to audit trail
- [x] **Admin TOTP reset** — admin can reset any user's 2FA secret (e.g. lost device)
- [x] **Email verification** — link sent on register; `email_verified` flag; `/verify-email/:uid/:token` page
- [x] **Security headers middleware** — CSP, Referrer-Policy, Permissions-Policy, X-Frame-Options
- [x] **Auth audit events** — LOGIN_FAILED, ACCOUNT_LOCKED, 2FA_SETUP_COMPLETE, 2FA_VERIFIED, TOTP_RESET, LOGOUT, password reset events all logged
- [x] **Sentry scrubbing** — strips private key, TOTP secrets, backup codes from error payloads
- [x] **Password reset** — email flow with Django tokens; always HTTP 200 (anti-enumeration); clears all tokens on confirm
- [x] **All Users admin tab** — PendingUsers page has Pending + All Users tabs

### UI / UX
- [x] **Dark / light mode toggle** — ThemeContext + localStorage; CSS vars (`--app-card`, `--app-text`, etc.); toggle in topbar; all content pages fully themed
- [x] **Collapsible sidebar** — desktop toggle (ChevronLeft ↔ Menu icon); 232 px full ↔ 64 px icon-only with smooth CSS transition; mobile still uses slide-in drawer; tooltips on collapsed icons
- [x] **Page transition animations** — Framer Motion `AnimatePresence` with `mode="wait"` wrapping all routes; fade + 6px slide-up
- [x] **Landing page** — dark minimal style; mobile hamburger menu; animated counters; bento feature grid; comparison table; responsive footer with Platform/Legal links
- [x] **Password strength indicator** — 4-segment colour bar in Register and ResetPassword (Weak/Fair/Good/Strong)
- [x] **Confirm password field** — Register page; real-time match validation; show/hide toggle on both fields
- [x] **Real-time inline validation** — touched-field pattern in Register; errors shown on blur, cleared on fix
- [x] **EmptyState component** — 6 typed SVG illustrations; dark-mode aware; action button variant
- [x] **Notification bell** — admin-only; derives alerts from stats (pending users, fraud flags, expiring creds); read state in localStorage
- [x] **Command palette** — Ctrl+K / ⌘K; live credential search; role-filtered nav links; keyboard navigation
- [x] **Bulk credential actions** — AllCredentials: checkbox select, select-all, floating action bar, bulk CSV export, bulk revoke with reason modal
- [x] **Single revoke modal** — AllCredentials single-row Revoke opens `RevokeReasonModal` instead of `window.confirm`
- [x] **Animated stat counters** — AdminDashboard counts animate from 0 to value on mount
- [x] **Skeleton loading** — shimmer placeholders in AdminDashboard while stats fetch
- [x] **Dark toast notifications** — dark navy toasts with slide-in animation; success/error/warning colour-coded
- [x] **Pending users badge** — amber count badge on "Pending Users" nav link when there are pending approvals
- [x] **Breadcrumb with Home icon** — topbar breadcrumb links to dashboard with role label + Home icon
- [x] **Shareable verify link** — VerifyCredential result banner has Copy/Share button that copies a direct URL
- [x] **Result card animations** — VerifyCredential error and result cards animate in with Framer Motion
- [x] **Page titles** — `useDocumentTitle` hook sets `<title>` as `"<Page> | VerifyDoc Uganda"` on every page
- [x] **Focus-visible ring** — global `:focus-visible` rule using `var(--clr-accent)` for keyboard accessibility
- [x] **Hidden scrollbars** — scrollbars hidden globally (including landing page) via CSS; scrolling still works
- [x] **Favicon** — teal ShieldCheck SVG matching the app logo; set in `public/favicon.svg`
- [x] **Logo links to landing** — all sidebar/topbar brand logos and page logos link back to `/`
- [x] **Brand navigation** — Login, Register, PendingApproval pages all have logo linking to `/`
- [x] **CSS utility classes** — `.hover-row` (theme-aware table row hover), `.skeleton` (shimmer animation), `@keyframes spin` — all in `index.css`
- [x] **Date utilities** — `fmtDate`, `fmtDateTime`, `relativeTime` in `utils/date.js` (no external dependency)
- [x] **ErrorBoundary** — wraps `<App>` in `main.jsx`; dark fallback UI; logs to console

---

## Environment Variables Reference (`.env`)

See `.env_example` for full annotated list. Critical ones:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key (generate with `get_random_secret_key()`) |
| `DEBUG` | `True` in dev, `False` in production |
| `DATABASE_URL` | SQLite (dev) or `postgres://...` (prod) |
| `POSTGRES_PASSWORD` | Docker Compose postgres password |
| `WEB3_PROVIDER_URL` | Infura Sepolia RPC endpoint |
| `DEPLOYER_ADDRESS` / `DEPLOYER_PRIVATE_KEY` | MetaMask wallet for on-chain writes |
| `CONTRACT_ADDRESS` | Deployed smart contract address |
| `PINATA_API_KEY` / `PINATA_SECRET_KEY` | IPFS upload credentials |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | Gmail SMTP (use App Password) |
| `AT_USERNAME` / `AT_API_KEY` | Africa's Talking SMS (leave blank to disable) |
| `SITE_URL` | Django base URL for email links |
| `FRONTEND_URL` | React SPA URL (password reset links + QR codes point here) |
| `CORS_ALLOWED_ORIGINS` | Production domains allowed to call the API |
| `TOKEN_EXPIRY_HOURS` | Auth token lifetime in hours (default: 8) |
| `LOGIN_MAX_ATTEMPTS` | Failed login attempts before lockout (default: 10) |
| `LOGIN_LOCKOUT_MINS` | Lockout duration in minutes (default: 15) |
| `SENTRY_DSN` | Sentry DSN (leave blank to disable error tracking) |
