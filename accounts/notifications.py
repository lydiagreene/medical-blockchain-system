"""
accounts/notifications.py
Standalone email functions for account lifecycle events.
(Signals handle registration & approval; this handles rejection.)
"""

import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _site_url():
    return getattr(settings, 'SITE_URL', 'http://127.0.0.1:8000')


def send_account_rejected_email(user, reason=''):
    """Email the user when their account registration is rejected."""
    if not user.email:
        return

    context = {
        'user': user,
        'reason': reason,
        'site_url': _site_url(),
        'register_url': f"{_site_url()}/accounts/register/",
    }

    subject = "[VerifyDoc] Your account registration was not approved"
    text_body = render_to_string('emails/account_rejected.txt', context)
    html_body = render_to_string('emails/account_rejected.html', context)

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        logger.info(f"Rejection email sent to: {user.email}")
    except Exception as e:
        logger.error(f"Failed to send rejection email: {e}")
