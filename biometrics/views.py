"""
biometrics/views.py
API endpoint that receives webcam photo and performs face verification
"""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from credentials.models import Credential

logger = logging.getLogger(__name__)


@csrf_exempt
@login_required
def verify_face_view(request):
    """
    Receives a license number and base64 webcam image.
    Returns face match result.
    """
    if request.method != 'POST':
        return JsonResponse(
            {'success': False, 'error': 'POST required'},
            status=405
        )

    try:
        data = json.loads(request.body)
        license_number = data.get('license_number')
        face_image_data = data.get('face_image_data')

        if not license_number:
            return JsonResponse(
                {'success': False, 'error': 'License number required'},
                status=400
            )

        if not face_image_data:
            return JsonResponse(
                {'success': False, 'error': 'Face image required'},
                status=400
            )

        # Get the credential
        try:
            credential = Credential.objects.get(
                license_number=license_number
            )
        except Credential.DoesNotExist:
            return JsonResponse(
                {'success': False, 'error': 'Credential not found'},
                status=404
            )

        # Check if photo exists on IPFS
        if not credential.ipfs_photo_hash:
            return JsonResponse({
                'success': False,
                'error': 'No photo registered for this credential',
                'is_match': False,
            })

        # Perform face verification
        from biometrics.face_utils import verify_practitioner_face

        result = verify_practitioner_face(
            ipfs_photo_hash=credential.ipfs_photo_hash,
            live_image_base64=face_image_data,
        )

        # Log the biometric check
        from credentials.models import VerificationLog
        VerificationLog.objects.create(
            credential=credential,
            queried_credential_id=license_number,
            verified_by=request.user,
            result='SUCCESS' if result.get('is_match') else 'FACE_MISMATCH',
            face_match=result.get('is_match', False),
            face_match_score=result.get('similarity_score', 0.0),
            blockchain_verified=False,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return JsonResponse({
            'success': True,
            'is_match': result.get('is_match', False),
            'similarity_score': result.get('similarity_score', 0.0),
            'message': (
                'Face verified successfully'
                if result.get('is_match')
                else 'Face does not match registered photo'
            )
        })

    except Exception as e:
        logger.error(f"Face verification endpoint error: {str(e)}")
        return JsonResponse(
            {'success': False, 'error': str(e)},
            status=500
        )