"""
credentials/admin.py
Registers credential models in Django admin panel
"""

from django.contrib import admin
from .models import Credential, VerificationLog


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):

    list_display = [
        'practitioner_name',
        'practitioner_id',
        'qualification',
        'license_number',
        'status',
        'is_on_blockchain',
        'created_at',
    ]

    list_filter = ['status', 'qualification']

    search_fields = [
        'practitioner_name',
        'practitioner_id',
        'license_number',
    ]

    readonly_fields = [
        'credential_id',
        'blockchain_tx_hash',
        'blockchain_recorded_at',
        'ipfs_document_hash',
        'ipfs_photo_hash',
        'created_at',
        'updated_at',
    ]


@admin.register(VerificationLog)
class VerificationLogAdmin(admin.ModelAdmin):

    list_display = [
        'queried_credential_id',
        'result',
        'face_match',
        'blockchain_verified',
        'flagged_as_suspicious',
        'timestamp',
    ]

    list_filter = [
        'result',
        'face_match',
        'blockchain_verified',
        'flagged_as_suspicious',
    ]

    readonly_fields = [
        'timestamp',
        'fraud_score',
        'face_match_score',
    ]