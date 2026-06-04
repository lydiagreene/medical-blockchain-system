import json
import logging
from pathlib import Path

from django.conf import settings
from django.shortcuts import render, redirect

logger = logging.getLogger(__name__)

_MANIFEST_PATH = Path(settings.BASE_DIR) / 'static' / 'react' / '.vite' / 'manifest.json'
_STATIC_REACT = '/static/react/'


def _load_manifest():
    try:
        with open(_MANIFEST_PATH) as f:
            return json.load(f)
    except Exception:
        return None


def landing_view(request):
    from credentials.models import Credential, VerificationLog, CredentialStatus

    context = {
        'total_credentials':   Credential.objects.count(),
        'active_credentials':  Credential.objects.filter(status=CredentialStatus.ACTIVE).count(),
        'total_verifications': VerificationLog.objects.count(),
    }
    return render(request, 'landing.html', context)


def spa_view(request):
    """
    Catch-all that serves the React SPA shell in production.
    In DEBUG mode redirects to the Vite dev server so HMR still works.
    """
    if settings.DEBUG:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}{request.get_full_path()}")

    manifest = _load_manifest()
    entry = manifest.get('src/main.jsx', {}) if manifest else {}

    js_file = entry.get('file', '')
    css_files = entry.get('css', [])

    context = {
        'js_url': f"{_STATIC_REACT}{js_file}" if js_file else None,
        'css_urls': [f"{_STATIC_REACT}{c}" for c in css_files],
    }
    return render(request, 'react_spa.html', context)


def handler404(request, exception=None):
    return render(request, 'errors/404.html', status=404)


def handler500(request):
    return render(request, 'errors/500.html', status=500)
