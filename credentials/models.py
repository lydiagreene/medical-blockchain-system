"""
credentials/models.py
Defines the Credential and VerificationLog models
for VerifyDoc Uganda
"""

from django.db import models
from accounts.models import CustomUser, Institution
import uuid


# ───────────────────────────────────────────
# CREDENTIAL STATUS CHOICES
# ───────────────────────────────────────────

class CredentialStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    REVOKED = 'REVOKED', 'Revoked'
    EXPIRED = 'EXPIRED', 'Expired'
    PENDING = 'PENDING', 'Pending'


# ───────────────────────────────────────────
# CREDENTIAL MODEL
# ───────────────────────────────────────────

class Credential(models.Model):
    """
    Represents a single medical practitioner's credential.
    Each credential is:
    - Stored in our Django database
    - Recorded on the Ethereum blockchain
    - Has its document stored on IPFS
    - Linked to a practitioner's face photo for biometric verification
    """

    # Unique ID for this credential
    # We use UUID so it cannot be guessed or forged
    credential_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        help_text="Unique identifier for this credential"
    )

    # ── Practitioner Details ──

    practitioner_name = models.CharField(
        max_length=255,
        help_text="Full name of the medical practitioner"
    )

    practitioner_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="National ID or passport number of the practitioner"
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    # ── Qualification Details ──

    qualification = models.CharField(
        max_length=255,
        help_text="e.g. MBChB, BDS, MMed"
    )

    specialization = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="e.g. Surgery, Paediatrics, Dentistry"
    )

    institution_of_study = models.CharField(
        max_length=255,
        help_text="University or institution where qualification was obtained"
    )

    year_of_graduation = models.IntegerField(
        help_text="Year the practitioner graduated"
    )

    license_number = models.CharField(
        max_length=100,
        unique=True,
        help_text="UMDPC license number"
    )

    license_expiry_date = models.DateField(
        help_text="Date the practicing license expires"
    )

    # ── Status ──

    status = models.CharField(
        max_length=20,
        choices=CredentialStatus.choices,
        default=CredentialStatus.ACTIVE,
    )

    revocation_reason = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Reason provided when the credential was revoked"
    )

    # ── Blockchain Details ──
    # These are filled in after the credential
    # is recorded on the blockchain

    blockchain_tx_hash = models.CharField(
        max_length=66,
        blank=True,
        null=True,
        help_text="Ethereum transaction hash from credential registration"
    )

    blockchain_recorded_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When this credential was recorded on the blockchain"
    )

    # ── IPFS Details ──
    # These are filled in after documents are uploaded to IPFS

    ipfs_document_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="IPFS content hash (CID) of the credential document"
    )

    ipfs_photo_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="IPFS content hash (CID) of the practitioner photo"
    )

    # ── Relationships ──

    issued_by = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        related_name='credentials_issued',
        help_text="The user who registered this credential"
    )

    issuing_institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name='credentials_issued',
        null=True,
        blank=True,
        help_text="The institution that issued this credential"
    )

    # ── Renewal tracking ──

    renewal_count = models.IntegerField(
        default=0,
        help_text="Number of times this credential has been renewed"
    )

    last_renewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the most recent renewal"
    )

    # ── Timestamps ──

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.practitioner_name} | "
            f"{self.qualification} | "
            f"{self.status}"
        )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Credential'
        verbose_name_plural = 'Credentials'

    # ── Helper Properties ──

    @property
    def is_active(self):
        return self.status == CredentialStatus.ACTIVE

    @property
    def is_revoked(self):
        return self.status == CredentialStatus.REVOKED

    @property
    def is_on_blockchain(self):
        return bool(self.blockchain_tx_hash)

    @property
    def has_document(self):
        return bool(self.ipfs_document_hash)

    @property
    def has_photo(self):
        return bool(self.ipfs_photo_hash)

    @property
    def credential_id_str(self):
        return str(self.credential_id)


# ───────────────────────────────────────────
# VERIFICATION LOG MODEL
# ───────────────────────────────────────────

class VerificationLog(models.Model):
    """
    Records every verification attempt made in the system.
    This data is used by the AI fraud detection model
    to identify suspicious patterns.
    """

    VERIFICATION_RESULTS = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('REVOKED', 'Credential Revoked'),
        ('NOT_FOUND', 'Credential Not Found'),
        ('FACE_MISMATCH', 'Face Mismatch'),
    ]

    # Which credential was being verified
    credential = models.ForeignKey(
        Credential,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_logs'
    )

    # The credential ID that was queried
    # (stored separately in case credential is deleted)
    queried_credential_id = models.CharField(
        max_length=100,
        help_text="The credential ID or license number that was queried"
    )

    # Who performed the verification
    verified_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verifications_performed'
    )

    # Result of the verification
    result = models.CharField(
        max_length=20,
        choices=VERIFICATION_RESULTS,
    )

    # Was the face biometric check passed
    face_match = models.BooleanField(
        default=False,
        help_text="Whether the biometric face check passed"
    )

    face_match_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Confidence score of face match (0.0 to 1.0)"
    )

    # Was blockchain check passed
    blockchain_verified = models.BooleanField(
        default=False,
        help_text="Whether the blockchain record confirmed the credential"
    )

    # Request metadata — used by fraud detection AI
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the verification request"
    )

    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="Browser and device information"
    )

    # Was this flagged as suspicious by the AI
    flagged_as_suspicious = models.BooleanField(
        default=False,
        help_text="Whether AI fraud detection flagged this attempt"
    )

    fraud_score = models.FloatField(
        null=True,
        blank=True,
        help_text="AI fraud risk score (higher = more suspicious)"
    )

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"{self.queried_credential_id} | "
            f"{self.result} | "
            f"{self.timestamp}"
        )

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Verification Log'
        verbose_name_plural = 'Verification Logs'