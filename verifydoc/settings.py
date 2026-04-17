"""
VerifyDoc Uganda - Django Settings
Blockchain-Based Medical Credential Verification System
"""

import os
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
]


# ───────────────────────────────────────────
# MIDDLEWARE
# ───────────────────────────────────────────

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # serves static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
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
# MEDIA FILES
# ───────────────────────────────────────────

MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'


# ───────────────────────────────────────────
# DEFAULT PRIMARY KEY
# ───────────────────────────────────────────

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


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

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)


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