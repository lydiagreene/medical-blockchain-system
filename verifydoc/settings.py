"""
VerifyDoc Uganda - Django Settings
Blockchain-Based Medical Credential Verification System
"""

import os
import sentry_sdk
from pathlib import Path
from decouple import config

# ───────────────────────────────────────────
# BASE DIRECTORY
# ───────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent


# ───────────────────────────────────────────
# SECURITY SETTINGS
# ───────────────────────────────────────────

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='127.0.0.1,localhost'
).split(',')


# ───────────────────────────────────────────
# INSTALLED APPS
# ───────────────────────────────────────────

INSTALLED_APPS = [
    # Django built-in apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Our custom apps
    'accounts',
    'credentials',
    'blockchain',
    'biometrics',
    'fraud_detection',
    'ipfs',

    # REST API
    'rest_framework',
    'rest_framework.authtoken',

    # CORS (allow React dev server to call the API)
    'corsheaders',

    # OpenAPI / Swagger docs
    'drf_spectacular',

    'api',
]


# ───────────────────────────────────────────
# MIDDLEWARE
# ───────────────────────────────────────────

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',        # must be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # serves static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'verifydoc.middleware.SecurityHeadersMiddleware',  # CSP + security headers
]


# ───────────────────────────────────────────
# URL CONFIGURATION
# ───────────────────────────────────────────

ROOT_URLCONF = 'verifydoc.urls'


# ───────────────────────────────────────────
# TEMPLATES
# ───────────────────────────────────────────

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # points to our templates folder
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ───────────────────────────────────────────
# WSGI
# ───────────────────────────────────────────

WSGI_APPLICATION = 'verifydoc.wsgi.application'


# ───────────────────────────────────────────
# DATABASE
# ───────────────────────────────────────────

# Supports both SQLite (dev) and PostgreSQL (prod) via DATABASE_URL env var.
# Dev:  DATABASE_URL=sqlite:///db.sqlite3
# Prod: DATABASE_URL=postgres://user:pass@host:5432/dbname
try:
    import dj_database_url
    _db_url = config('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
    DATABASES = {'default': dj_database_url.parse(_db_url, conn_max_age=600)}
except ImportError:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# ───────────────────────────────────────────
# CUSTOM USER MODEL
# ───────────────────────────────────────────

# We use our own user model instead of Django's default
# This allows us to add roles (issuer, verifier, admin)
AUTH_USER_MODEL = 'accounts.CustomUser'


# ───────────────────────────────────────────
# AUTHENTICATION
# ───────────────────────────────────────────

# Where to send users when they are not logged in
LOGIN_URL = '/accounts/login/'

# Where to send users after successful login
LOGIN_REDIRECT_URL = '/accounts/dashboard/'

# Where to send users after logout
LOGOUT_REDIRECT_URL = '/accounts/login/'


# ───────────────────────────────────────────
# PASSWORD VALIDATION
# ───────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'NumericPasswordValidator',
    },
]


# ───────────────────────────────────────────
# LOCALISATION
# ───────────────────────────────────────────

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Africa/Kampala'

USE_I18N = True

USE_TZ = True


# ───────────────────────────────────────────
# STATIC FILES
# ───────────────────────────────────────────

STATIC_URL = '/static/'

STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ───────────────────────────────────────────
# SECURITY HARDENING (active when DEBUG=False)
# ───────────────────────────────────────────

# Always on — prevents clickjacking regardless of environment
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

if not DEBUG:
    # Force all traffic over HTTPS
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)

    # Tell browsers to only connect via HTTPS for 1 year
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Cookies only sent over HTTPS
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Trust the X-Forwarded-Proto header from reverse proxies (Nginx, Render, etc.)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


# ───────────────────────────────────────────
# MEDIA FILES
# ───────────────────────────────────────────

MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'


# ───────────────────────────────────────────
# DEFAULT PRIMARY KEY
# ───────────────────────────────────────────

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ───────────────────────────────────────────
# CORS
# ───────────────────────────────────────────

# Dev: Vite runs on 5173. Prod: add your domain to CORS_ALLOWED_ORIGINS env var.
# e.g. CORS_ALLOWED_ORIGINS=https://verifydoc.ug,https://www.verifydoc.ug
_cors_extra = [
    o.strip() for o in config('CORS_ALLOWED_ORIGINS', default='').split(',') if o.strip()
]
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
] + _cors_extra
CORS_ALLOW_CREDENTIALS = True

# Origins trusted for CSRF on unsafe POSTs over HTTPS (required for the Django
# /admin/ login when DEBUG=False behind a proxy). Comma-separated, scheme included,
# e.g. CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in config('CSRF_TRUSTED_ORIGINS', default='').split(',') if o.strip()
]


# ───────────────────────────────────────────
# BLOCKCHAIN SETTINGS
# ───────────────────────────────────────────

BLOCKCHAIN = {
    'PROVIDER_URL': config('WEB3_PROVIDER_URL'),
    'DEPLOYER_ADDRESS': config('DEPLOYER_ADDRESS'),
    'DEPLOYER_PRIVATE_KEY': config('DEPLOYER_PRIVATE_KEY'),
    'CONTRACT_ADDRESS': config('CONTRACT_ADDRESS', default=''),
}


# ───────────────────────────────────────────
# IPFS / PINATA SETTINGS
# ───────────────────────────────────────────

PINATA = {
    'API_KEY': config('PINATA_API_KEY', default=''),
    'SECRET_KEY': config('PINATA_SECRET_KEY', default=''),
    'BASE_URL': config('PINATA_BASE_URL',
                       default='https://api.pinata.cloud'),
}


# ───────────────────────────────────────────
# EMAIL SETTINGS
# ───────────────────────────────────────────

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('EMAIL_HOST_USER', default='noreply@verifydoc.ug')

# Base URL used in email links — no trailing slash
SITE_URL = config('SITE_URL', default='http://127.0.0.1:8000')

# React frontend base URL — used in password reset emails so the link opens the SPA.
# Dev: Vite runs on 5173. Prod: same domain as SITE_URL (set FRONTEND_URL=https://yourdomain.com).
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')


# ───────────────────────────────────────────
# LOGGING
# ───────────────────────────────────────────

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/system.log',
            'formatter': 'verbose',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file', 'console'],
        'level': 'INFO',
    },
}


# ───────────────────────────────────────────
# DJANGO REST FRAMEWORK
# ───────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'api.authentication.CookieTokenAuthentication',      # HttpOnly cookie (primary)
        'api.authentication.ExpiringTokenAuthentication',    # Bearer header (API clients)
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Global fallback rates
        'anon': '120/hour',
        'user': '1000/hour',
        # Per-endpoint named scopes (see api/throttles.py)
        'login':          '5/min',    # 5 login attempts per minute per IP
        'two_factor':     '5/min',    # 5 OTP attempts per minute per IP
        'password_reset': '3/hour',   # 3 reset emails per hour per IP
        'public_verify':  '30/min',   # 30 public lookups per minute per IP
        'face_verify':    '20/hour',  # 20 biometric checks per hour per user
    },
}


# ───────────────────────────────────────────
# SESSION / TOKEN SECURITY
# ───────────────────────────────────────────

# Auth tokens expire after this many hours; users must re-authenticate
TOKEN_EXPIRY_HOURS = config('TOKEN_EXPIRY_HOURS', default=8, cast=int)

# Lockout thresholds — configurable via env
LOGIN_MAX_ATTEMPTS  = config('LOGIN_MAX_ATTEMPTS',  default=10, cast=int)
LOGIN_LOCKOUT_MINS  = config('LOGIN_LOCKOUT_MINS',  default=15, cast=int)


# ───────────────────────────────────────────
# AFRICA'S TALKING — SMS
# ───────────────────────────────────────────
# Leave AT_USERNAME / AT_API_KEY empty to disable SMS (emails still send).
# Sandbox: username="sandbox", api_key="any-string"
AT_USERNAME   = config('AT_USERNAME',  default='')
AT_API_KEY    = config('AT_API_KEY',   default='')
AT_SENDER_ID  = config('AT_SENDER_ID', default='')   # Alphanumeric sender ID (must be registered)
AT_SHORTCODE  = config('AT_SHORTCODE', default='')   # Short code alternative to sender ID
AT_COUNTRY_CODE = config('AT_COUNTRY_CODE', default='256')  # Uganda


# ───────────────────────────────────────────
# FRAUD DETECTION SETTINGS
# ───────────────────────────────────────────

FRAUD_DETECTION = {
    # Path to the saved trained model
    'MODEL_PATH': BASE_DIR / 'fraud_detection/saved_model/fraud_model.pkl',
    # How many verification attempts trigger a flag review
    'MAX_ATTEMPTS_PER_HOUR': 10,
}


# ───────────────────────────────────────────
# BIOMETRICS SETTINGS
# ───────────────────────────────────────────

BIOMETRICS = {
    # Minimum confidence score for a face match to be accepted
    # 0.6 means 60% similarity required — adjust after testing
    'MATCH_THRESHOLD': 0.6,
    # Folder where practitioner photos are temporarily stored
    'PHOTO_DIR': BASE_DIR / 'media/practitioner_photos',
}


# ───────────────────────────────────────────
# SENTRY ERROR TRACKING
# ───────────────────────────────────────────
# Set SENTRY_DSN in .env to enable. Leave empty to disable (dev default).

SENTRY_DSN = config('SENTRY_DSN', default='')

if SENTRY_DSN:
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    import logging

    _SENSITIVE_KEYS = {
        'DEPLOYER_PRIVATE_KEY', 'SECRET_KEY', 'PINATA_SECRET_KEY',
        'EMAIL_HOST_PASSWORD', 'AT_API_KEY', 'totp_secret',
        'totp_backup_codes', 'password', 'token', 'auth_token',
    }

    def _before_send(event, hint):
        """Scrub sensitive keys from Sentry events before sending."""
        def _scrub(obj):
            if isinstance(obj, dict):
                return {
                    k: '[Filtered]' if k in _SENSITIVE_KEYS else _scrub(v)
                    for k, v in obj.items()
                }
            if isinstance(obj, list):
                return [_scrub(i) for i in obj]
            return obj
        return _scrub(event)

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style='url'),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
        send_default_pii=False,
        before_send=_before_send,
        environment='production' if not DEBUG else 'development',
        release=config('APP_VERSION', default='1.0.0'),
    )


# ───────────────────────────────────────────
# OPENAPI / SWAGGER (drf-spectacular)
# ───────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    'TITLE': 'VerifyDoc Uganda API',
    'DESCRIPTION': (
        'Blockchain-based Medical Credential Verification System. '
        'All endpoints under /api/v1/ — authenticate with Token <your-token> header.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
    'TAGS': [
        {'name': 'auth',         'description': 'Login, register, password reset, profile'},
        {'name': 'credentials',  'description': 'Issue, list, detail, revoke, renew credentials'},
        {'name': 'biometrics',   'description': 'Face verification'},
        {'name': 'admin',        'description': 'Admin-only: users, audit log, fraud, institutions'},
        {'name': 'public',       'description': 'Public credential lookup (no auth)'},
    ],
}