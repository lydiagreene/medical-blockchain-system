"""
api/credential_views.py
Credential-specific API views not in the main views.py.
"""

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from credentials.models import Credential, CredentialStatus
from accounts.models import Role


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renew_credential_api(request, credential_id):
    """POST /api/v1/credentials/<id>/renew/  — extend license expiry."""
    user = request.user

    try:
        credential = Credential.objects.get(credential_id=credential_id)
    except Credential.DoesNotExist:
        return Response({'detail': 'Credential not found.'}, status=404)

    if not (user.is_superuser or user.role == Role.ADMIN):
        if not (user.role == Role.ISSUER and credential.issued_by == user):
            return Response({'detail': 'You do not have permission to renew this credential.'}, status=403)

    if credential.status == CredentialStatus.REVOKED:
        return Response({'detail': 'Revoked credentials cannot be renewed.'}, status=400)

    new_expiry = request.data.get('license_expiry_date')
    if not new_expiry:
        return Response({'license_expiry_date': 'New expiry date is required.'}, status=400)

    from datetime import date
    try:
        expiry_date = date.fromisoformat(str(new_expiry))
    except ValueError:
        return Response({'license_expiry_date': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

    if expiry_date <= timezone.now().date():
        return Response({'license_expiry_date': 'New expiry date must be in the future.'}, status=400)

    credential.license_expiry_date = expiry_date
    credential.renewal_count = (credential.renewal_count or 0) + 1
    credential.last_renewed_at = timezone.now()
    if credential.status == CredentialStatus.EXPIRED:
        credential.status = CredentialStatus.ACTIVE
    credential.save()

    try:
        from accounts.models import log_action
        log_action(user, 'CREDENTIAL_RENEWED', target=credential, request=request)
    except Exception:
        pass

    try:
        from credentials.notifications import send_credential_renewed_email
        send_credential_renewed_email(credential)
    except Exception:
        pass

    return Response({
        'detail': 'Credential renewed successfully.',
        'license_expiry_date': str(credential.license_expiry_date),
        'renewal_count': credential.renewal_count,
        'status': credential.status,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def certificate_api(request, credential_id):
    """GET /api/v1/credentials/<id>/certificate/ — download PDF verification certificate."""
    try:
        credential = Credential.objects.get(credential_id=credential_id)
    except Credential.DoesNotExist:
        return Response({'detail': 'Credential not found.'}, status=404)

    from credentials.pdf_utils import generate_certificate_pdf
    from django.http import HttpResponse
    from django.conf import settings

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    try:
        pdf_bytes = generate_certificate_pdf(
            credential,
            generated_by_user=request.user,
            frontend_url=frontend_url,
        )
    except Exception as e:
        return Response({'detail': f'PDF generation failed: {e}'}, status=500)

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    safe_name = credential.license_number.replace('/', '-')
    response['Content-Disposition'] = f'attachment; filename="certificate_{safe_name}.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def blockchain_status_api(request, credential_id):
    """GET /api/v1/credentials/<id>/blockchain-status/ — live tx confirmation count."""
    try:
        credential = Credential.objects.get(credential_id=credential_id)
    except Credential.DoesNotExist:
        return Response({'detail': 'Credential not found.'}, status=404)

    if not credential.blockchain_tx_hash:
        return Response({'has_tx': False, 'detail': 'Not yet recorded on blockchain.'})

    from blockchain.utils import get_tx_status
    status_data = get_tx_status(credential.blockchain_tx_hash)
    return Response({
        'has_tx': True,
        'tx_hash': credential.blockchain_tx_hash,
        **status_data,
    })
