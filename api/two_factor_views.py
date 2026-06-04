"""
api/two_factor_views.py
Mandatory TOTP two-factor authentication endpoints.

Flow:
  1. POST /api/v1/auth/login/       → { requires_2fa: true/false (setup), partial_token }
  2a. POST /api/v1/auth/2fa/setup/  → { secret, otpauth_uri }          (first-time setup)
  2b. POST /api/v1/auth/2fa/confirm/→ { backup_codes, user }           (complete setup — sets cookie)
  2c. POST /api/v1/auth/2fa/verify/ → { user }                         (subsequent logins — sets cookie)
"""

import json
import secrets
import string
import pyotp
import logging

from django.core import signing
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import CustomUser, log_action
from rest_framework.authtoken.models import Token
from .throttles import TwoFactorRateThrottle

logger = logging.getLogger(__name__)

_SALT       = 'verifydoc_2fa_partial'
_SETUP_TTL  = 600   # 10 min — user needs time to install app
_VERIFY_TTL = 300   # 5 min  — normal login step

ISSUER_NAME = 'VerifyDoc Uganda'


# ── Partial token helpers ────────────────────────────────────────────────────

def make_partial_token(user_id: int) -> str:
    return signing.dumps({'uid': user_id}, salt=_SALT)


def load_partial_token(token: str, max_age: int) -> int:
    """Returns user_id or raises signing.BadSignature / signing.SignatureExpired."""
    data = signing.loads(token, salt=_SALT, max_age=max_age)
    return data['uid']


# ── Backup code helpers ──────────────────────────────────────────────────────

_BC_ALPHA = string.ascii_uppercase + string.digits


def _generate_backup_codes(n: int = 8) -> list[str]:
    """Generate n random codes in format XXXX-XXXX."""
    codes = []
    for _ in range(n):
        p1 = ''.join(secrets.choice(_BC_ALPHA) for _ in range(4))
        p2 = ''.join(secrets.choice(_BC_ALPHA) for _ in range(4))
        codes.append(f'{p1}-{p2}')
    return codes


def _hash_backup_codes(codes: list[str]) -> str:
    """Return JSON string of hashed, unused backup codes."""
    return json.dumps([
        {'hash': make_password(c.replace('-', '')), 'used': False}
        for c in codes
    ])


def _consume_backup_code(raw: str, stored_json: str) -> tuple[bool, str]:
    """
    Attempt to use a backup code.
    Returns (matched, updated_json) — caller saves updated_json on success.
    """
    try:
        entries = json.loads(stored_json)
    except (json.JSONDecodeError, TypeError):
        return False, stored_json

    normalized = raw.replace('-', '').upper()
    for i, entry in enumerate(entries):
        if not entry['used'] and check_password(normalized, entry['hash']):
            entries[i]['used'] = True
            return True, json.dumps(entries)
    return False, stored_json


# ── Cookie helper ────────────────────────────────────────────────────────────

def _set_auth_cookie(response, token_key: str) -> None:
    expiry_hours = getattr(settings, 'TOKEN_EXPIRY_HOURS', 8)
    response.set_cookie(
        'auth_token',
        token_key,
        max_age=expiry_hours * 3600,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path='/',
    )


# ── User payload ─────────────────────────────────────────────────────────────

def _user_payload(user):
    inst_name = user.institution.name if user.institution_id else user.institution_name
    return {
        'id':               user.id,
        'username':         user.username,
        'email':            user.email,
        'role':             user.role,
        'institution_id':   user.institution_id,
        'institution_name': inst_name,
        'phone_number':     user.phone_number,
        'is_approved':      user.is_approved,
        'is_superuser':     user.is_superuser,
        'date_joined':      user.date_joined,
        'email_verified':   user.email_verified,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TwoFactorRateThrottle])
def api_2fa_setup(request):
    """
    POST /api/v1/auth/2fa/setup/
    Body: { partial_token }

    Generates (or retrieves) the TOTP secret and returns the otpauth:// URI
    for the authenticator app to scan.
    """
    partial_token = request.data.get('partial_token', '').strip()
    if not partial_token:
        return Response({'detail': 'partial_token is required.'}, status=400)

    try:
        uid = load_partial_token(partial_token, max_age=_SETUP_TTL)
        user = CustomUser.objects.get(pk=uid)
    except (signing.BadSignature, signing.SignatureExpired, CustomUser.DoesNotExist):
        return Response({'detail': 'Session expired or invalid. Please log in again.'}, status=400)

    if not user.totp_secret:
        user.totp_secret = pyotp.random_base32()
        user.save(update_fields=['totp_secret'])

    totp = pyotp.TOTP(user.totp_secret)
    otpauth_uri = totp.provisioning_uri(name=user.username, issuer_name=ISSUER_NAME)

    return Response({'secret': user.totp_secret, 'otpauth_uri': otpauth_uri})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TwoFactorRateThrottle])
def api_2fa_confirm(request):
    """
    POST /api/v1/auth/2fa/confirm/
    Body: { partial_token, code }

    Verifies the first TOTP code after setup, enables 2FA, generates backup codes,
    issues the full auth token as an HttpOnly cookie.
    Returns { backup_codes: [...], user } — backup codes shown ONCE.
    """
    partial_token = request.data.get('partial_token', '').strip()
    code          = request.data.get('code', '').strip().replace(' ', '')

    if not partial_token or not code:
        return Response({'detail': 'partial_token and code are required.'}, status=400)

    try:
        uid = load_partial_token(partial_token, max_age=_SETUP_TTL)
        user = CustomUser.objects.get(pk=uid)
    except (signing.BadSignature, signing.SignatureExpired, CustomUser.DoesNotExist):
        return Response({'detail': 'Session expired. Please log in again.'}, status=400)

    if not user.totp_secret:
        return Response({'detail': 'No 2FA secret found. Please restart setup.'}, status=400)

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1):
        return Response({'detail': 'Incorrect code. Check your authenticator app and try again.'}, status=400)

    # Generate backup codes
    raw_codes = _generate_backup_codes(8)
    user.totp_enabled     = True
    user.totp_backup_codes = _hash_backup_codes(raw_codes)
    user.save(update_fields=['totp_enabled', 'totp_backup_codes'])

    token, _ = Token.objects.get_or_create(user=user)
    log_action(user, '2FA_SETUP_COMPLETE', request=request)
    logger.info(f'2FA enabled for user {user.username}')

    response = Response({'backup_codes': raw_codes, 'user': _user_payload(user)})
    _set_auth_cookie(response, token.key)
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TwoFactorRateThrottle])
def api_2fa_verify(request):
    """
    POST /api/v1/auth/2fa/verify/
    Body: { partial_token, code }

    Verifies TOTP code (or backup code) on every subsequent login.
    Issues the full auth token as an HttpOnly cookie.
    Returns { user }.
    """
    partial_token = request.data.get('partial_token', '').strip()
    code          = request.data.get('code', '').strip()

    if not partial_token or not code:
        return Response({'detail': 'partial_token and code are required.'}, status=400)

    try:
        uid = load_partial_token(partial_token, max_age=_VERIFY_TTL)
        user = CustomUser.objects.get(pk=uid)
    except signing.SignatureExpired:
        return Response({'detail': 'Session expired. Please log in again.', 'expired': True}, status=400)
    except (signing.BadSignature, CustomUser.DoesNotExist):
        return Response({'detail': 'Invalid session. Please log in again.'}, status=400)

    if not user.totp_enabled or not user.totp_secret:
        return Response({'detail': '2FA not configured for this account.'}, status=400)

    # Normalise code — strip dashes/spaces
    normalized = code.replace('-', '').replace(' ', '')

    # Try TOTP first (6-digit numeric)
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(normalized, valid_window=1):
        pass  # Verified via TOTP
    elif user.totp_backup_codes:
        # Try backup code (XXXX-XXXX or XXXXXXXX format)
        matched, updated_json = _consume_backup_code(code, user.totp_backup_codes)
        if not matched:
            return Response({'detail': 'Incorrect code. Check your authenticator app and try again.'}, status=400)
        user.totp_backup_codes = updated_json
        user.save(update_fields=['totp_backup_codes'])
        logger.info(f'User {user.username} used a backup code')
    else:
        return Response({'detail': 'Incorrect code. Check your authenticator app and try again.'}, status=400)

    token, _ = Token.objects.get_or_create(user=user)
    log_action(user, '2FA_VERIFIED', request=request)
    logger.info(f'2FA verified for user {user.username}')

    response = Response({'user': _user_payload(user)})
    _set_auth_cookie(response, token.key)
    return response
