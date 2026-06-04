"""
credentials/management/commands/check_license_expiry.py

Run daily (e.g. via Windows Task Scheduler or cron):
    python manage.py check_license_expiry

What it does:
  1. Marks credentials whose expiry date has passed as EXPIRED
     and emails the issuer + all admins.
  2. Sends HTML alert emails at 30, 7, and 1 day(s) before expiry
     to the issuer who registered the credential and all admins.

Options:
  --dry-run   Preview what would happen without saving changes or sending emails.
"""

import logging
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.conf import settings

from credentials.models import Credential, CredentialStatus
from credentials.notifications import (
    send_expiry_warning_email,
    send_credential_expired_email,
    send_expiry_warning_sms,
    send_credential_expired_sms,
)

logger = logging.getLogger(__name__)

ALERT_DAYS = [30, 7, 1]


def _admin_recipients():
    """Returns list of (email, name) for all approved admin/superuser accounts."""
    from django.db.models import Q
    from accounts.models import CustomUser, Role
    qs = CustomUser.objects.filter(
        is_active=True, is_approved=True,
    ).filter(Q(is_superuser=True) | Q(role=Role.ADMIN))
    return [(u.email, u.username) for u in qs if u.email]


def _notify_expiry_warning(credential, days_left, dry_run=False):
    """Send warning emails + SMS to the issuer and all admins."""
    recipients = []

    if credential.issued_by and credential.issued_by.email:
        recipients.append((credential.issued_by.email, credential.issued_by.username))

    for email, name in _admin_recipients():
        if not any(r[0] == email for r in recipients):
            recipients.append((email, name))

    if not recipients:
        logger.warning(f"No recipients for expiry warning: {credential.license_number}")
        return 0

    issuer_phone = (
        credential.issued_by.phone_number
        if credential.issued_by else None
    )

    if dry_run:
        print(
            f"    [DRY RUN] Would email {len(recipients)} recipient(s): "
            + ", ".join(e for e, _ in recipients)
        )
        if issuer_phone:
            print(f"    [DRY RUN] Would SMS issuer: {issuer_phone}")
        return len(recipients)

    for email, name in recipients:
        send_expiry_warning_email(credential, days_left, email, name)

    # SMS the issuer directly (most reliable channel in Uganda)
    if issuer_phone:
        send_expiry_warning_sms(credential, days_left, issuer_phone)

    return len(recipients)


def _notify_expired(credential, dry_run=False):
    """Send 'credential has expired' emails + SMS to the issuer and all admins."""
    recipients = []

    if credential.issued_by and credential.issued_by.email:
        recipients.append((credential.issued_by.email, credential.issued_by.username))

    for email, name in _admin_recipients():
        if not any(r[0] == email for r in recipients):
            recipients.append((email, name))

    if not recipients:
        return 0

    issuer_phone = (
        credential.issued_by.phone_number
        if credential.issued_by else None
    )

    if dry_run:
        print(
            f"    [DRY RUN] Would email {len(recipients)} recipient(s): "
            + ", ".join(e for e, _ in recipients)
        )
        if issuer_phone:
            print(f"    [DRY RUN] Would SMS issuer: {issuer_phone}")
        return len(recipients)

    for email, name in recipients:
        send_credential_expired_email(credential, email, name)

    if issuer_phone:
        send_credential_expired_sms(credential, issuer_phone)

    return len(recipients)


class Command(BaseCommand):
    help = (
        "Check license expiry dates: auto-expire overdue credentials "
        "and send HTML alert emails at 30, 7, and 1 day(s) before expiry."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview actions without saving changes or sending emails.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = date.today()

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN MODE — no changes will be saved ===\n"))

        self.stdout.write(f"Running expiry check for {today.strftime('%d %B %Y')}...\n")

        # ── Step 1: Auto-expire overdue active credentials ──
        overdue = Credential.objects.filter(
            status=CredentialStatus.ACTIVE,
            license_expiry_date__lt=today,
        ).select_related('issued_by')

        expired_count = overdue.count()
        total_expired_emails = 0

        if expired_count:
            self.stdout.write(
                self.style.WARNING(
                    f"Found {expired_count} overdue credential(s) to mark EXPIRED:"
                )
            )
            for cred in overdue:
                self.stdout.write(
                    f"  • {cred.practitioner_name} ({cred.license_number})"
                    f" — expired {cred.license_expiry_date}"
                )
                sent = _notify_expired(cred, dry_run=dry_run)
                total_expired_emails += sent

            if not dry_run:
                overdue.update(status=CredentialStatus.EXPIRED)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ Marked {expired_count} credential(s) as EXPIRED."
                    )
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ Sent {total_expired_emails} expiry notification email(s)."
                    )
                )
        else:
            self.stdout.write("  No overdue credentials found.\n")

        # ── Step 2: Send alerts for upcoming expiries ──
        total_alerts = 0
        total_alert_emails = 0

        self.stdout.write("\nChecking upcoming expiries...")
        for days in ALERT_DAYS:
            target_date = today + timedelta(days=days)
            expiring = Credential.objects.filter(
                status=CredentialStatus.ACTIVE,
                license_expiry_date=target_date,
            ).select_related('issued_by')

            count = expiring.count()
            if not count:
                self.stdout.write(
                    f"  No credentials expiring in exactly {days} day(s)."
                )
                continue

            label = "TOMORROW" if days == 1 else f"in {days} days"
            self.stdout.write(
                self.style.WARNING(
                    f"  Found {count} credential(s) expiring {label} ({target_date}):"
                )
            )

            for cred in expiring:
                self.stdout.write(
                    f"    • {cred.practitioner_name} ({cred.license_number})"
                )
                sent = _notify_expiry_warning(cred, days, dry_run=dry_run)
                total_alert_emails += sent
                total_alerts += 1

        if total_alerts:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n  ✓ Sent {total_alert_emails} warning email(s) "
                    f"for {total_alerts} credential(s)."
                )
            )
        else:
            self.stdout.write("  No upcoming expiry alerts needed today.")

        self.stdout.write(
            self.style.SUCCESS("\ncheck_license_expiry complete.")
        )
