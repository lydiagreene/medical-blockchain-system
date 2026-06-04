"""
verifydoc/middleware.py
Security headers added to every response.
"""

from django.conf import settings


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content Security Policy
        # 'unsafe-inline' for scripts/styles is required by React's runtime
        # and Vite's HMR in development. Tighten with nonces in production.
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' wss: ws:; "
            "media-src 'self' blob:; "
            "worker-src blob:; "
            "frame-ancestors 'none';"
        )
        response['Content-Security-Policy'] = csp

        # Don't leak the full URL to third-party origins
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Camera is required by the face-verify feature; restrict everything else
        response['Permissions-Policy'] = (
            "camera=(self), microphone=(), geolocation=(), payment=()"
        )

        # Prevent this page being embedded in frames on other origins
        # (X-Frame-Options=DENY is set in settings.py, this is the modern equivalent)
        response['Cross-Origin-Opener-Policy'] = 'same-origin'

        return response
