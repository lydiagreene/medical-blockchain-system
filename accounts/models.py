"""
accounts/models.py
Defines the custom user model with roles for VerifyDoc Uganda
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


# ───────────────────────────────────────────
# USER ROLES
# ───────────────────────────────────────────

class Role(models.TextChoices):
    ISSUER = 'ISSUER', 'Issuer'           # Medical school or UMDPC
    VERIFIER = 'VERIFIER', 'Verifier'     # Hospital or clinic
    ADMIN = 'ADMIN', 'Admin'              # System administrator


# ───────────────────────────────────────────
# CUSTOM USER MODEL
# ───────────────────────────────────────────

class CustomUser(AbstractUser):
    """
    Extends Django's default user with:
    - A role (Issuer, Verifier, or Admin)
    - An institution name
    - A phone number
    - An approval status
    """

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VERIFIER,
    )

    institution = models.ForeignKey(
        'Institution',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members',
        help_text="Registered institution this user belongs to",
    )

    institution_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Display name — auto-populated from institution FK when set"
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    is_approved = models.BooleanField(
        default=False,
        help_text="Admin must approve this account before user can log in"
    )

    # ── Two-Factor Authentication ──
    totp_secret = models.CharField(
        max_length=64, blank=True, null=True,
        help_text="Base32 TOTP secret for authenticator apps"
    )
    totp_enabled = models.BooleanField(
        default=False,
        help_text="Whether the user has completed 2FA setup"
    )
    totp_backup_codes = models.TextField(
        blank=True, null=True,
        help_text="JSON array of hashed one-time backup codes"
    )

    # ── Account lockout ──
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(
        null=True, blank=True,
        help_text="Account locked until this datetime after repeated failures"
    )

    # ── Email verification ──
    email_verified = models.BooleanField(
        default=False,
        help_text="Whether the user has verified their email address"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role}) - {self.institution_name}"

    # ── Helper properties to check role cleanly ──

    @property
    def is_issuer(self):
        return self.role == Role.ISSUER

    @property
    def is_verifier(self):
        return self.role == Role.VERIFIER

    @property
    def is_system_admin(self):
        return self.role == Role.ADMIN


# ───────────────────────────────────────────
# INSTITUTION MODEL
# ───────────────────────────────────────────

class Institution(models.Model):
    """
    Represents a registered medical institution.
    Could be a medical school, hospital, clinic, or the UMDPC.
    """

    INSTITUTION_TYPES = [
        ('UNIVERSITY', 'Medical University'),
        ('HOSPITAL', 'Hospital'),
        ('CLINIC', 'Clinic'),
        ('LICENSING_BODY', 'Licensing Body'),
    ]

    name = models.CharField(max_length=255, unique=True)

    institution_type = models.CharField(
        max_length=20,
        choices=INSTITUTION_TYPES,
    )

    address = models.TextField(blank=True, null=True)

    contact_email = models.EmailField(unique=True)

    contact_phone = models.CharField(max_length=20, blank=True, null=True)

    is_active = models.BooleanField(
        default=True,
        help_text="Inactive institutions cannot issue or verify credentials"
    )

    # The blockchain wallet address of this institution
    # Used to verify that on-chain transactions come from authorised sources
    wallet_address = models.CharField(
        max_length=42,
        blank=True,
        null=True,
        help_text="Ethereum wallet address of this institution"
    )

    registered_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='institutions_registered'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.institution_type})"

    class Meta:
        ordering = ['name']


# ───────────────────────────────────────────
# AUDIT LOG MODEL
# ───────────────────────────────────────────

class AuditLog(models.Model):
    """
    Immutable record of every significant admin/system action.
    Written once; never updated or deleted.
    """

    ACTION_CHOICES = [
        # User management
        ('USER_APPROVED',        'User Approved'),
        ('USER_REJECTED',        'User Rejected'),
        # Credential lifecycle
        ('CREDENTIAL_ISSUED',    'Credential Issued'),
        ('CREDENTIAL_REVOKED',   'Credential Revoked'),
        ('CREDENTIAL_RENEWED',   'Credential Renewed'),
        ('CREDENTIAL_EXPIRED',   'Credential Marked Expired'),
        # Auth events
        ('LOGIN_SUCCESS',        'Login Successful'),
        ('LOGIN_FAILED',         'Login Failed'),
        ('LOGOUT',               'Logged Out'),
        ('ACCOUNT_LOCKED',       'Account Locked'),
        # 2FA events
        ('2FA_SETUP_COMPLETE',   '2FA Setup Completed'),
        ('2FA_VERIFIED',         '2FA Verified on Login'),
        ('TOTP_RESET',           'Admin Reset User 2FA'),
        # Password / email
        ('PASSWORD_RESET_REQUESTED', 'Password Reset Requested'),
        ('PASSWORD_RESET_COMPLETED', 'Password Reset Completed'),
        ('EMAIL_VERIFIED',       'Email Address Verified'),
        # Misc
        ('PROFILE_UPDATED',      'Profile Updated'),
        ('PASSWORD_CHANGED',     'Password Changed'),
    ]

    actor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_actions',
        help_text="User who performed the action",
    )

    action = models.CharField(max_length=40, choices=ACTION_CHOICES)

    target_type = models.CharField(
        max_length=50, blank=True,
        help_text="Model name of the affected object (e.g. 'CustomUser', 'Credential')",
    )
    target_id = models.CharField(
        max_length=100, blank=True,
        help_text="PK or UUID of the affected object",
    )
    target_description = models.CharField(
        max_length=255, blank=True,
        help_text="Human-readable summary of the affected object",
    )

    notes = models.TextField(blank=True, help_text="Extra context or reason")

    ip_address = models.GenericIPAddressField(null=True, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        actor = self.actor.username if self.actor else 'system'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor} — {self.get_action_display()}: {self.target_description}"

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log Entry'
        verbose_name_plural = 'Audit Log'


def log_action(actor, action, target=None, notes='', request=None):
    """
    Helper to create an AuditLog entry in one line.

    Usage:
        log_action(request.user, 'USER_APPROVED', target=approved_user, request=request)
        log_action(request.user, 'CREDENTIAL_REVOKED', target=credential, request=request)
    """
    target_type = ''
    target_id = ''
    target_desc = ''

    if target is not None:
        target_type = target.__class__.__name__
        # Prefer credential_id for Credential objects
        target_id = str(getattr(target, 'credential_id', None) or getattr(target, 'pk', ''))
        target_desc = str(target)[:255]

    ip = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')

    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_description=target_desc,
        notes=notes,
        ip_address=ip,
    )