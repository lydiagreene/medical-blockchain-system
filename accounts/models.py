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

    institution_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Name of the medical institution this user belongs to"
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