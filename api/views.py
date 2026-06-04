"""
api/views.py
REST API views for VerifyDoc Uganda.

Endpoints:
  POST /api/v1/auth/token/               — obtain auth token (username + password)
  GET  /api/v1/verify/<license>/         — public credential lookup (no auth)
  GET  /api/v1/credentials/             — list credentials (token required)
  POST /api/v1/credentials/             — issue new credential (ISSUER only)
  GET  /api/v1/credentials/<uuid>/      — credential detail (token required)
  POST /api/v1/credentials/<uuid>/revoke/ — revoke credential (ADMIN only)
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .throttles import PublicVerifyRateThrottle
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from credentials.models import Credential, CredentialStatus
from accounts.models import Role
from .serializers import (
    CredentialPublicSerializer,
    CredentialListSerializer,
    CredentialDetailSerializer,
    CredentialCreateSerializer,
    CredentialRevokeSerializer,
)

logger = logging.getLogger(__name__)


# ── Public: employer/hospital credential lookup ──────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([PublicVerifyRateThrottle])
def public_verify(request, license_number):
    """
    GET /api/v1/verify/<license_number>/

    Returns credential status and basic practitioner info.
    No authentication required — intended for employers and hospitals.
    Does NOT include IPFS hashes or internal IDs.
    """
    try:
        credential = Credential.objects.get(
            license_number=license_number.upper()
        )
    except Credential.DoesNotExist:
        return Response(
            {'detail': 'No credential found with this license number.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = CredentialPublicSerializer(credential)
    data = serializer.data

    # Enrich with live blockchain status if available
    try:
        from blockchain.utils import verify_credential_on_chain
        bc = verify_credential_on_chain(license_number)
        data['blockchain_active'] = (
            bc.get('success') and bc.get('is_active', False)
        )
    except Exception:
        data['blockchain_active'] = None

    return Response(data)


# ── Authenticated: credential list + create ──────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def credential_list(request):
    """
    GET  /api/v1/credentials/   — paginated list (ADMIN sees all; ISSUER sees own)
    POST /api/v1/credentials/   — issue new credential (ISSUER only)

    GET query params:
      q              — search name, license no., practitioner ID, institution
      status         — ACTIVE | REVOKED | EXPIRED | PENDING
      qualification  — partial match on qualification
    """
    user = request.user

    # ── POST: issue new credential ──────────────────────────────────────────
    if request.method == 'POST':
        if user.role != Role.ISSUER and not user.is_superuser:
            return Response(
                {'detail': 'Only issuers can create credentials via the API.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Enforce active institution check
        if user.institution_id and not user.institution.is_active:
            return Response(
                {'detail': 'Your institution has been deactivated. Contact the administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CredentialCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone as tz
        credential = serializer.save(
            issued_by=user,
            status=CredentialStatus.ACTIVE,
            issuing_institution=user.institution,
        )

        # Optional file uploads (multipart/form-data)
        document_file = request.FILES.get('credential_document')
        photo_file = request.FILES.get('practitioner_photo')

        # Convert base64 webcam capture to a file if no photo file was uploaded
        if not photo_file:
            webcam_data = request.data.get('webcam_photo_data', '')
            if webcam_data:
                import base64 as _b64
                from io import BytesIO
                from django.core.files.uploadedfile import InMemoryUploadedFile
                try:
                    raw = webcam_data.split(',', 1)[1] if ',' in webcam_data else webcam_data
                    img_bytes = _b64.b64decode(raw)
                    bio = BytesIO(img_bytes)
                    safe_name = credential.practitioner_name.replace(' ', '_')
                    photo_file = InMemoryUploadedFile(
                        bio, 'practitioner_photo',
                        f'webcam_{safe_name}.jpg', 'image/jpeg',
                        len(img_bytes), None,
                    )
                except Exception as e:
                    logger.warning(f"API webcam photo decode error: {e}")

        if document_file or photo_file:
            try:
                from ipfs.pinata_utils import upload_document_to_ipfs, upload_photo_to_ipfs
                if document_file:
                    doc_result = upload_document_to_ipfs(document_file, credential.practitioner_name)
                    if doc_result['success']:
                        credential.ipfs_document_hash = doc_result['ipfs_hash']
                if photo_file:
                    photo_result = upload_photo_to_ipfs(photo_file, credential.practitioner_name)
                    if photo_result['success']:
                        credential.ipfs_photo_hash = photo_result['ipfs_hash']
                credential.save()
            except Exception as e:
                logger.warning(f"API IPFS upload error during credential creation: {e}")

        # Blockchain recording
        blockchain_tx = None
        try:
            from blockchain.utils import issue_credential_on_chain
            bc = issue_credential_on_chain(
                license_number=credential.license_number,
                practitioner_name=credential.practitioner_name,
                practitioner_id=credential.practitioner_id,
                qualification=credential.qualification,
                ipfs_document_hash=credential.ipfs_document_hash or '',
                ipfs_photo_hash=credential.ipfs_photo_hash or '',
            )
            if bc.get('success'):
                credential.blockchain_tx_hash = bc['tx_hash']
                credential.blockchain_recorded_at = tz.now()
                credential.save(update_fields=['blockchain_tx_hash', 'blockchain_recorded_at'])
                blockchain_tx = bc['tx_hash']
        except Exception as e:
            logger.warning(f"API blockchain recording error: {e}")

        # Email + SMS the issuer
        try:
            from credentials.notifications import send_credential_issued_email, send_credential_issued_sms
            send_credential_issued_email(credential)
            send_credential_issued_sms(credential)
        except Exception as e:
            logger.warning(f"API credential issued notification error: {e}")

        response_data = CredentialDetailSerializer(credential).data
        response_data['blockchain_recorded'] = bool(blockchain_tx)
        logger.info(f"API: credential created — {credential.license_number} by {user.username}")
        return Response(response_data, status=status.HTTP_201_CREATED)

    # ── GET: paginated list ─────────────────────────────────────────────────
    if user.is_superuser or user.role == Role.ADMIN:
        qs = Credential.objects.all()
    elif user.role == Role.ISSUER:
        qs = Credential.objects.filter(issued_by=user)
    else:
        return Response(
            {'detail': 'You do not have permission to list credentials.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    from django.db.models import Q
    q = request.query_params.get('q', '').strip()
    status_filter = request.query_params.get('status', '').strip().upper()
    qual_filter = request.query_params.get('qualification', '').strip()

    if q:
        qs = qs.filter(
            Q(practitioner_name__icontains=q) |
            Q(license_number__icontains=q) |
            Q(practitioner_id__icontains=q) |
            Q(institution_of_study__icontains=q)
        )
    if status_filter in ('ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING'):
        qs = qs.filter(status=status_filter)
    if qual_filter:
        qs = qs.filter(qualification__icontains=qual_filter)

    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(qs, request)
    serializer = CredentialListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


# ── Authenticated: credential detail ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def credential_detail(request, credential_id):
    """
    GET /api/v1/credentials/<credential_id>/

    Returns full credential details including IPFS hashes and Etherscan link.
    Admins see any credential; issuers can only retrieve their own.
    """
    user = request.user

    try:
        credential = Credential.objects.get(credential_id=credential_id)
    except Credential.DoesNotExist:
        return Response(
            {'detail': 'Credential not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not (user.is_superuser or user.role == Role.ADMIN):
        if not (user.role == Role.ISSUER and credential.issued_by == user):
            return Response(
                {'detail': 'You do not have permission to view this credential.'},
                status=status.HTTP_403_FORBIDDEN,
            )

    serializer = CredentialDetailSerializer(credential)
    return Response(serializer.data)


# ── Authenticated: revoke credential ─────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_credential(request, credential_id):
    """
    POST /api/v1/credentials/<credential_id>/revoke/

    Revokes an active credential. Admin/superuser only.
    Optional JSON body: {"reason": "..."}
    """
    user = request.user

    if not (user.is_superuser or user.role == Role.ADMIN):
        return Response(
            {'detail': 'Only administrators can revoke credentials.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        credential = Credential.objects.get(credential_id=credential_id)
    except Credential.DoesNotExist:
        return Response(
            {'detail': 'Credential not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if credential.status == CredentialStatus.REVOKED:
        return Response(
            {'detail': 'Credential is already revoked.'},
            status=status.HTTP_409_CONFLICT,
        )

    serializer = CredentialRevokeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Blockchain revocation
    blockchain_revoked = False
    try:
        from blockchain.utils import revoke_credential_on_chain
        bc = revoke_credential_on_chain(credential.license_number)
        blockchain_revoked = bc.get('success', False)
    except Exception as e:
        logger.warning(f"API blockchain revocation error: {e}")

    reason = serializer.validated_data.get('reason', '')
    credential.status = CredentialStatus.REVOKED
    credential.revocation_reason = reason or None
    credential.save(update_fields=['status', 'revocation_reason', 'updated_at'])

    try:
        from credentials.notifications import send_credential_revoked_email
        send_credential_revoked_email(credential)
    except Exception as e:
        logger.warning(f"API revoke email error: {e}")

    logger.info(
        f"API: credential revoked — {credential.license_number} by {user.username}"
    )
    return Response({
        'detail': 'Credential revoked successfully.',
        'license_number': credential.license_number,
        'practitioner_name': credential.practitioner_name,
        'blockchain_revoked': blockchain_revoked,
    })
