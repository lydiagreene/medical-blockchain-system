"""
api/authentication.py
Custom DRF authentication classes:
  - ExpiringTokenAuthentication  — Bearer token with TTL
  - CookieTokenAuthentication    — HttpOnly cookie, inherits expiry check
"""

from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    """
    Standard 'Authorization: Token <key>' auth that rejects tokens
    older than TOKEN_EXPIRY_HOURS (default 8 h).
    """

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        expiry_hours = getattr(settings, 'TOKEN_EXPIRY_HOURS', 8)
        age = timezone.now() - token.created
        if age > timedelta(hours=expiry_hours):
            token.delete()
            raise AuthenticationFailed(
                'Your session has expired. Please sign in again.',
                code='token_expired',
            )
        return user, token


class CookieTokenAuthentication(ExpiringTokenAuthentication):
    """
    Reads the auth token from the HttpOnly 'auth_token' cookie.
    Falls through to the next auth class if the cookie is absent or stale.
    CSRF is handled by SameSite=Lax + strict CORS (no extra CSRF check needed).
    """

    def authenticate(self, request):
        token_key = request.COOKIES.get('auth_token')
        if not token_key:
            return None
        try:
            return self.authenticate_credentials(token_key)
        except AuthenticationFailed:
            # Stale or deleted cookie — treat as unauthenticated so the
            # login endpoint (and other AllowAny views) are not blocked.
            return None

    def enforce_csrf(self, request):
        return  # SameSite=Lax + CORS provides equivalent protection
