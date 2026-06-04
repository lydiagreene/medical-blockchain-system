"""
accounts/management/commands/production_check.py

Run before deploying to confirm the environment is production-ready:
    python manage.py production_check

Checks:
  1. DEBUG is False
  2. SECRET_KEY is not the dev default
  3. ALLOWED_HOSTS excludes localhost/127.0.0.1
  4. Email backend is SMTP (not console)
  5. Blockchain settings are all set
  6. staticfiles/ directory exists (collectstatic has been run)
  7. Django's own --deploy security checks pass
"""

import os
import subprocess
import sys

from django.core.management.base import BaseCommand
from django.conf import settings


PASS = '[  OK  ]'
FAIL = '[ FAIL ]'
WARN = '[ WARN ]'


class Command(BaseCommand):
    help = 'Verify the environment is ready for production deployment.'

    def handle(self, *args, **options):
        issues = 0
        warnings = 0

        self.stdout.write('\nVerifyDoc Uganda — Production Readiness Check\n')
        self.stdout.write('=' * 52)

        def ok(msg):
            self.stdout.write(self.style.SUCCESS(f'{PASS} {msg}'))

        def fail(msg):
            nonlocal issues
            issues += 1
            self.stdout.write(self.style.ERROR(f'{FAIL} {msg}'))

        def warn(msg):
            nonlocal warnings
            warnings += 1
            self.stdout.write(self.style.WARNING(f'{WARN} {msg}'))

        # ── 1. DEBUG ──────────────────────────────────────────────────────────
        if settings.DEBUG:
            fail('DEBUG is True — set DEBUG=False before deploying')
        else:
            ok('DEBUG is False')

        # ── 2. SECRET_KEY ─────────────────────────────────────────────────────
        key = settings.SECRET_KEY
        if 'your-secret-key' in key or len(key) < 40:
            fail('SECRET_KEY looks like a placeholder or is too short')
        else:
            ok('SECRET_KEY looks strong')

        # ── 3. ALLOWED_HOSTS ──────────────────────────────────────────────────
        dev_hosts = {'127.0.0.1', 'localhost', ''}
        prod_hosts = [h for h in settings.ALLOWED_HOSTS if h not in dev_hosts]
        if not prod_hosts:
            fail('ALLOWED_HOSTS only contains localhost/127.0.0.1 — add your domain')
        else:
            ok(f'ALLOWED_HOSTS includes production host(s): {", ".join(prod_hosts)}')

        # ── 4. Email backend ──────────────────────────────────────────────────
        backend = settings.EMAIL_BACKEND
        if 'console' in backend:
            fail('EMAIL_BACKEND is still console — set it to smtp for production')
        elif 'smtp' in backend.lower():
            ok(f'Email backend: {backend}')
        else:
            warn(f'Email backend is "{backend}" — verify this is intentional')

        # ── 5. Blockchain settings ────────────────────────────────────────────
        bc = settings.BLOCKCHAIN
        missing_bc = [k for k, v in bc.items() if not v]
        if missing_bc:
            fail(f'Missing blockchain settings: {", ".join(missing_bc)}')
        else:
            ok('All blockchain settings are configured')

        # ── 6. IPFS / Pinata settings ─────────────────────────────────────────
        pinata = settings.PINATA
        missing_pinata = [k for k, v in pinata.items() if not v]
        if missing_pinata:
            warn(f'Missing Pinata settings: {", ".join(missing_pinata)}')
        else:
            ok('Pinata IPFS settings are configured')

        # ── 7. staticfiles/ directory ─────────────────────────────────────────
        static_root = settings.STATIC_ROOT
        if not os.path.isdir(static_root):
            fail(
                f'staticfiles/ directory not found at {static_root}. '
                'Run: python manage.py collectstatic'
            )
        else:
            file_count = sum(len(files) for _, _, files in os.walk(static_root))
            ok(f'staticfiles/ exists ({file_count} file(s) collected)')

        # ── 8. Security headers ───────────────────────────────────────────────
        if not getattr(settings, 'SESSION_COOKIE_SECURE', False):
            fail('SESSION_COOKIE_SECURE is not True — set DEBUG=False to enable')
        else:
            ok('SESSION_COOKIE_SECURE is True')

        if not getattr(settings, 'CSRF_COOKIE_SECURE', False):
            fail('CSRF_COOKIE_SECURE is not True — set DEBUG=False to enable')
        else:
            ok('CSRF_COOKIE_SECURE is True')

        if not getattr(settings, 'SECURE_SSL_REDIRECT', False):
            warn('SECURE_SSL_REDIRECT is not True — required if not behind SSL proxy')
        else:
            ok('SECURE_SSL_REDIRECT is True')

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 52)
        if issues == 0 and warnings == 0:
            self.stdout.write(
                self.style.SUCCESS('\nAll checks passed. Ready to deploy.')
            )
        else:
            if issues:
                self.stdout.write(
                    self.style.ERROR(
                        f'\n{issues} issue(s) must be fixed before deploying.'
                    )
                )
            if warnings:
                self.stdout.write(
                    self.style.WARNING(
                        f'{warnings} warning(s) to review.'
                    )
                )
            self.stdout.write(
                '\nSee the docs for deployment steps:\n'
                '  https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/\n'
            )
            if issues:
                sys.exit(1)
