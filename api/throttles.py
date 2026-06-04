"""
api/throttles.py
Custom DRF throttle classes for rate-limiting sensitive endpoints.

Rates are configured in settings.py under REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
Using named scopes lets us set different limits per endpoint type.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """5 login attempts per minute per IP — brute-force protection."""
    scope = 'login'


class PasswordResetRateThrottle(AnonRateThrottle):
    """3 password-reset requests per hour per IP — prevents email flooding."""
    scope = 'password_reset'


class PublicVerifyRateThrottle(AnonRateThrottle):
    """30 public credential lookups per minute per IP."""
    scope = 'public_verify'


class TwoFactorRateThrottle(AnonRateThrottle):
    """5 TOTP attempts per 5 minutes per IP — prevents OTP brute force."""
    scope = 'two_factor'


class FaceVerifyRateThrottle(UserRateThrottle):
    """20 biometric face-verify calls per hour per authenticated user."""
    scope = 'face_verify'
