"""
accounts/signals.py
Sends email notifications to admins and users on account lifecycle events.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _site_url():
    return getattr(settings, 'SITE_URL', 'http://127.0.0.1:8000')


def _send(subject, text_body, html_body, recipient_list):
    """Send a multipart plain-text + HTML email."""
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list,
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
        return True
    except Exception as e:
        logger.error(f"Email send failed ({subject!r}): {e}")
        return False


def _get_admin_emails():
    """Returns email addresses of all approved admin and superuser accounts."""
    from django.db.models import Q
    from accounts.models import CustomUser, Role
    admins = CustomUser.objects.filter(
        is_active=True,
        is_approved=True,
    ).filter(Q(is_superuser=True) | Q(role=Role.ADMIN))
    return [e for e in admins.values_list('email', flat=True) if e]


@receiver(post_save, sender='accounts.CustomUser')
def notify_admin_on_registration(sender, instance, created, **kwargs):
    """Email all admins when a new non-superuser account is created."""
    if not created or instance.is_superuser:
        return

    admin_emails = _get_admin_emails()
    if not admin_emails:
        logger.warning("No admin emails found — skipping registration notification.")
        return

    site_url = _site_url()
    context = {
        'new_user': instance,
        'admin_url': f"{site_url}/admin/accounts/customuser/{instance.pk}/change/",
        'site_url': site_url,
    }

    subject = f"[VerifyDoc] New account pending approval: {instance.username}"
    text_body = (
        f"A new user has registered and is waiting for approval.\n\n"
        f"Username:    {instance.username}\n"
        f"Email:       {instance.email}\n"
        f"Role:        {instance.get_role_display()}\n"
        f"Institution: {instance.institution_name or 'Not provided'}\n"
        f"Phone:       {instance.phone_number or 'Not provided'}\n"
        f"Registered:  {instance.created_at.strftime('%d %b %Y, %H:%M')}\n\n"
        f"Approve or reject at:\n{context['admin_url']}\n\n"
        f"— VerifyDoc Uganda System"
    )
    html_body = render_to_string('emails/account_pending_admin.html', context)

    if _send(subject, text_body, html_body, admin_emails):
        logger.info(
            f"Registration notification sent to {len(admin_emails)} admin(s) "
            f"for new user: {instance.username}"
        )


@receiver(post_save, sender='accounts.CustomUser')
def notify_user_on_approval(sender, instance, created, update_fields, **kwargs):
    """Email the user when their account is approved."""
    if created or not instance.email:
        return
    if update_fields and 'is_approved' not in update_fields:
        return
    if not instance.is_approved:
        return

    site_url = _site_url()
    context = {
        'user': instance,
        'login_url': f"{site_url}/accounts/login/",
        'site_url': site_url,
    }

    subject = "[VerifyDoc] Your account has been approved"
    text_body = (
        f"Hello {instance.username},\n\n"
        f"Your VerifyDoc Uganda account has been approved by an administrator.\n\n"
        f"You can now log in and start using the system:\n"
        f"{context['login_url']}\n\n"
        f"Role:        {instance.get_role_display()}\n"
        f"Institution: {instance.institution_name or 'Not provided'}\n\n"
        f"— VerifyDoc Uganda System"
    )
    html_body = render_to_string('emails/account_approved.html', context)

    if _send(subject, text_body, html_body, [instance.email]):
        logger.info(f"Approval notification sent to: {instance.username}")
