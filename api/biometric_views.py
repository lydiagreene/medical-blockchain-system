"""
api/biometric_views.py
DRF face-verification endpoint — token-auth wrapper around biometrics.face_utils.
"""
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .throttles import FaceVerifyRateThrottle

from credentials.models import Credential, CredentialStatus


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([FaceVerifyRateThrottle])
def verify_face_api(request):
    """
    POST /api/v1/biometrics/verify-face/
    Body: { license_number, face_image_data }  (face_image_data is base64 data-URL or raw base64)
    """
    license_number = request.data.get('license_number', '').strip().upper()
    face_image_data = request.data.get('face_image_data', '')

    if not license_number:
        return Response({'detail': 'license_number is required.'}, status=400)
    if not face_image_data:
        return Response({'detail': 'face_image_data is required.'}, status=400)

    try:
        credential = Credential.objects.get(license_number=license_number)
    except Credential.DoesNotExist:
        return Response({'detail': 'No credential found with this license number.'}, status=404)

    if credential.status != CredentialStatus.ACTIVE:
        return Response(
            {'detail': f'Credential is {credential.status}, not ACTIVE.'},
            status=400
        )

    if not credential.ipfs_photo_hash:
        return Response(
            {'detail': 'No biometric photo is registered for this credential.'},
            status=400
        )

    from biometrics.face_utils import verify_practitioner_face
    result = verify_practitioner_face(credential.ipfs_photo_hash, face_image_data)

    try:
        from accounts.models import log_action
        match_label = 'MATCH' if result.get('is_match') else 'NO MATCH'
        score = result.get('similarity_score', 0)
        notes = f"Face verify: {match_label} (similarity={score:.3f})"
        log_action(request.user, 'CREDENTIAL_VERIFIED', target=credential, request=request, notes=notes)
    except Exception:
        pass

    registered_photo_url = (
        f"https://gateway.pinata.cloud/ipfs/{credential.ipfs_photo_hash}"
        if credential.ipfs_photo_hash else None
    )

    return Response({
        'success': result.get('success', False),
        'is_match': result.get('is_match', False),
        'similarity_score': result.get('similarity_score', 0.0),
        'message': (
            result.get('error', 'Verification error')
            if not result.get('success')
            else ('Face matched successfully.' if result.get('is_match') else 'Face does not match the registered photo.')
        ),
        'practitioner_name': credential.practitioner_name,
        'license_number': credential.license_number,
        'qualification': credential.qualification,
        'status': credential.status,
        'registered_photo_url': registered_photo_url,
    })
