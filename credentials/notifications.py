"""
credentials/notifications.py
Email notifications for credential lifecycle events.
"""

import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _site_url():
    return getattr(settings, 'SITE_URL', 'http://127.0.0.1:8000')


def _frontend_url():
    return getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')


def send_credential_issued_email(credential):
    """Email the issuer when they successfully register a new credential."""
    issuer = credential.issued_by
    if not issuer or not issuer.email:
        return

    context = {
        'credential': credential,
        'issuer': issuer,
        'site_url': _site_url(),
        'credential_url': f"{_site_url()}/credentials/{credential.credential_id}/",
        'blockchain_confirmed': bool(credential.blockchain_tx_hash),
    }

    subject = f"[VerifyDoc] Credential issued — {credential.practitioner_name}"
    text_body = render_to_string('emails/credential_issued.txt', context)
    html_body = render_to_string('emails/credential_issued.html', context)

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[issuer.email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        logger.info(
            f"Credential issued email sent to {issuer.email} "
            f"for license {credential.license_number}"
        )
    except Exception as e:
        logger.error(f"Failed to send credential issued email: {e}")


def send_expiry_warning_email(credential, days_left, recipient_email, recipient_name):
    """Email a single recipient about an upcoming credential expiry."""
    site_url = _site_url()
    context = {
        'credential': credential,
        'days_left': days_left,
        'recipient_name': recipient_name,
        'credential_url': f"{site_url}/credentials/{credential.credential_id}/",
    }

    if days_left == 1:
        urgency = "expires TOMORROW"
    else:
        urgency = f"expiring in {days_left} days"

    subject = (
        f"[VerifyDoc] License {urgency}: "
        f"{credential.practitioner_name} ({credential.license_number})"
    )
    text_body = render_to_string('emails/license_expiry_warning.txt', context)
    html_body = render_to_string('emails/license_expiry_warning.html', context)

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        logger.info(
            f"Expiry warning ({days_left}d) sent to {recipient_email} "
            f"for {credential.license_number}"
        )
    except Exception as e:
        logger.error(f"Failed to send expiry warning email: {e}")


def send_credential_expired_email(credential, recipient_email, recipient_name):
    """Email a single recipient that a credential has been auto-expired."""
    site_url = _site_url()
    context = {
        'credential': credential,
        'recipient_name': recipient_name,
        'credential_url': f"{site_url}/credentials/{credential.credential_id}/",
    }

    subject = (
        f"[VerifyDoc] Credential expired: "
        f"{credential.practitioner_name} ({credential.license_number})"
    )
    text_body = render_to_string('emails/license_expired.txt', context)
    html_body = render_to_string('emails/license_expired.html', context)

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        logger.info(
            f"Expiry notification sent to {recipient_email} "
            f"for {credential.license_number}"
        )
    except Exception as e:
        logger.error(f"Failed to send credential expired email: {e}")


def send_credential_renewed_email(credential):
    """Email the issuer when they successfully renew a credential."""
    issuer = credential.issued_by
    if not issuer or not issuer.email:
        return

    site_url = _site_url()
    context = {
        'credential': credential,
        'issuer': issuer,
        'site_url': site_url,
        'credential_url': f"{site_url}/credentials/{credential.credential_id}/",
    }

    subject = f"[VerifyDoc] Credential renewed — {credential.practitioner_name}"
    text_body = render_to_string('emails/credential_renewed.txt', context)
    html_body = render_to_string('emails/credential_renewed.html', context)

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[issuer.email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        logger.info(
            f"Credential renewed email sent to {issuer.email} "
            f"for license {credential.license_number}"
        )
    except Exception as e:
        logger.error(f"Failed to send credential renewed email: {e}")


def send_expiry_warning_sms(credential, days_left: int, phone: str) -> bool:
    """SMS the issuer about an upcoming credential expiry."""
    from .sms_utils import send_sms
    expiry = credential.license_expiry_date.strftime('%d %b %Y')
    frontend = _frontend_url().rstrip('/')

    if days_left == 1:
        prefix = "CRITICAL"
        timing = "expires TOMORROW"
    elif days_left <= 7:
        prefix = "URGENT"
        timing = f"expires in {days_left} days ({expiry})"
    else:
        prefix = "VerifyDoc Alert"
        timing = f"expires in {days_left} days ({expiry})"

    msg = (
        f"{prefix}: {credential.practitioner_name} "
        f"({credential.license_number}) {timing}. "
        f"Renew at {frontend}/dashboard"
    )
    return send_sms(msg, phone)


def send_credential_expired_sms(credential, phone: str) -> bool:
    """SMS the issuer that a credential has just been auto-expired."""
    from .sms_utils import send_sms
    frontend = _frontend_url().rstrip('/')
    msg = (
        f"VerifyDoc: {credential.practitioner_name} "
        f"({credential.license_number}) license has EXPIRED and is now invalid. "
        f"Login to renew: {frontend}/dashboard"
    )
    return send_sms(msg, phone)


def send_credential_issued_sms(credential) -> bool:
    """SMS the issuer a confirmation when they register a new credential."""
    from .sms_utils import send_sms
    issuer = credential.issued_by
    if not issuer or not issuer.phone_number:
        return False
    expiry = credential.license_expiry_date.strftime('%d %b %Y')
    msg = (
        f"VerifyDoc: Credential issued for {credential.practitioner_name} "
        f"({credential.license_number}). "
        f"Valid until {expiry}."
    )
    return send_sms(msg, issuer.phone_number)


def send_credential_revoked_email(credential):
    """Email the original issuer when their issued credential is revoked."""
    issuer = credential.issued_by
    if not issuer or not issuer.email:
        return

    context = {
        'credential': credential,
        'issuer': issuer,
        'site_url': _site_url(),
    }

    subject = f"[VerifyDoc] Credential revoked — {credential.practitioner_name}"
    text_body = render_to_string('emails/credential_revoked.txt', context)
    html_body = render_to_string('emails/credential_revoked.html', context)

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[issuer.email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        logger.info(
            f"Credential revoked email sent to {issuer.email} "
            f"for license {credential.license_number}"
        )
    except Exception as e:
        logger.error(f"Failed to send credential revoked email: {e}")
