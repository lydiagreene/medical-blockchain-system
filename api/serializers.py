"""
api/serializers.py
DRF serializers for the VerifyDoc REST API.

Two tiers:
  CredentialPublicSerializer  — minimal fields for the public /verify/ endpoint
  CredentialListSerializer    — summary row for authenticated list endpoint
  CredentialDetailSerializer  — full record for authenticated detail endpoint
"""

from rest_framework import serializers
from django.utils import timezone
from credentials.models import Credential


class CredentialPublicSerializer(serializers.ModelSerializer):
    """
    Safe subset returned to unauthenticated callers (employers, hospitals).
    Never exposes internal IDs, IPFS hashes, or issuer identity.
    """
    photo_url = serializers.SerializerMethodField()
    blockchain_verified = serializers.SerializerMethodField()

    class Meta:
        model = Credential
        fields = [
            'license_number',
            'practitioner_name',
            'qualification',
            'specialization',
            'institution_of_study',
            'year_of_graduation',
            'license_expiry_date',
            'status',
            'revocation_reason',
            'blockchain_tx_hash',
            'blockchain_recorded_at',
            'photo_url',
            'blockchain_verified',
        ]

    def get_photo_url(self, obj):
        if obj.ipfs_photo_hash:
            return f"https://gateway.pinata.cloud/ipfs/{obj.ipfs_photo_hash}"
        return None

    def get_blockchain_verified(self, obj):
        return bool(obj.blockchain_tx_hash)


class CredentialListSerializer(serializers.ModelSerializer):
    """Summary row — used for the paginated authenticated list."""
    issued_by = serializers.StringRelatedField()
    issuing_institution_name = serializers.SerializerMethodField()

    class Meta:
        model = Credential
        fields = [
            'credential_id',
            'practitioner_name',
            'qualification',
            'license_number',
            'license_expiry_date',
            'status',
            'issued_by',
            'issuing_institution_name',
            'created_at',
        ]

    def get_issuing_institution_name(self, obj):
        return obj.issuing_institution.name if obj.issuing_institution_id else None


class CredentialDetailSerializer(serializers.ModelSerializer):
    """Full record — authenticated callers only."""
    issued_by = serializers.StringRelatedField()
    issuing_institution_name = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    etherscan_url = serializers.SerializerMethodField()

    class Meta:
        model = Credential
        fields = [
            'credential_id',
            'practitioner_name',
            'practitioner_id',
            'date_of_birth',
            'qualification',
            'specialization',
            'institution_of_study',
            'year_of_graduation',
            'license_number',
            'license_expiry_date',
            'status',
            'revocation_reason',
            'blockchain_tx_hash',
            'blockchain_recorded_at',
            'ipfs_document_hash',
            'ipfs_photo_hash',
            'document_url',
            'photo_url',
            'etherscan_url',
            'issued_by',
            'issuing_institution_name',
            'created_at',
            'updated_at',
        ]

    def get_issuing_institution_name(self, obj):
        return obj.issuing_institution.name if obj.issuing_institution_id else None

    def get_document_url(self, obj):
        if obj.ipfs_document_hash:
            return f"https://gateway.pinata.cloud/ipfs/{obj.ipfs_document_hash}"
        return None

    def get_photo_url(self, obj):
        if obj.ipfs_photo_hash:
            return f"https://gateway.pinata.cloud/ipfs/{obj.ipfs_photo_hash}"
        return None

    def get_etherscan_url(self, obj):
        if obj.blockchain_tx_hash:
            return f"https://sepolia.etherscan.io/tx/{obj.blockchain_tx_hash}"
        return None


class CredentialCreateSerializer(serializers.ModelSerializer):
    """
    Validates input for POST /api/v1/credentials/.
    Files (credential_document, practitioner_photo) are handled separately
    in the view because they go to IPFS, not the database.
    """

    class Meta:
        model = Credential
        fields = [
            'practitioner_name',
            'practitioner_id',
            'date_of_birth',
            'qualification',
            'specialization',
            'institution_of_study',
            'year_of_graduation',
            'license_number',
            'license_expiry_date',
        ]

    def validate_year_of_graduation(self, value):
        current_year = timezone.now().year
        if value < 1950 or value > current_year:
            raise serializers.ValidationError(
                f'Year must be between 1950 and {current_year}.'
            )
        return value

    def validate_license_expiry_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError(
                'License expiry date cannot be in the past.'
            )
        return value


class CredentialRevokeSerializer(serializers.Serializer):
    """Optional body for POST /api/v1/credentials/<id>/revoke/."""
    reason = serializers.CharField(
        required=False,
        max_length=500,
        allow_blank=True,
        help_text='Optional reason for revocation.',
    )
