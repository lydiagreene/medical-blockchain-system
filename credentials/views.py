"""
credentials/views.py
Handles credential issuance, verification and revocation
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.http import JsonResponse
from .models import Credential, VerificationLog, CredentialStatus
from .forms import CredentialRegistrationForm, CredentialVerificationForm
from accounts.models import Role
import logging

logger = logging.getLogger(__name__)


# ───────────────────────────────────────────
# ISSUE CREDENTIAL VIEW
# ───────────────────────────────────────────

@login_required
def issue_credential_view(request):
    if request.user.role != Role.ISSUER and not request.user.is_superuser:
        messages.error(
            request,
            'You do not have permission to issue credentials.'
        )
        return redirect('accounts:dashboard')

    form = CredentialRegistrationForm()

    if request.method == 'POST':
        form = CredentialRegistrationForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                # Save to database first
                credential = form.save(commit=False)
                credential.issued_by = request.user
                credential.status = CredentialStatus.ACTIVE
                credential.save()

                # ── Step 1: Upload document to IPFS ──
                from ipfs.pinata_utils import (
                    upload_document_to_ipfs,
                    upload_photo_to_ipfs
                )

                document_file = request.FILES.get('credential_document')
                photo_file = request.FILES.get('practitioner_photo')

                # If no uploaded photo check for webcam capture
                if not photo_file:
                    webcam_photo_data = request.POST.get('webcam_photo_data')
                    if webcam_photo_data:
                        # Convert base64 webcam image to a file-like object
                        import base64
                        import io
                        from django.core.files.uploadedfile import InMemoryUploadedFile

                        try:
                            if ',' in webcam_photo_data:
                                webcam_photo_data = webcam_photo_data.split(',')[1]
                            image_bytes = base64.b64decode(webcam_photo_data)
                            photo_file = InMemoryUploadedFile(
                                file=io.BytesIO(image_bytes),
                                field_name='practitioner_photo',
                                name=f"webcam_{credential.practitioner_name.replace(' ', '_')}.jpg",
                                content_type='image/jpeg',
                                size=len(image_bytes),
                                charset=None,
                            )
                            logger.info("Webcam photo captured for registration")
                        except Exception as e:
                            logger.warning(f"Webcam photo processing error: {str(e)}")

                ipfs_document_hash = ''
                ipfs_photo_hash = ''

                if document_file:
                    doc_result = upload_document_to_ipfs(
                        document_file,
                        credential.practitioner_name
                    )
                    if doc_result['success']:
                        ipfs_document_hash = doc_result['ipfs_hash']
                        credential.ipfs_document_hash = ipfs_document_hash
                        logger.info(
                            f"Document uploaded to IPFS: {ipfs_document_hash}"
                        )
                    else:
                        logger.warning(
                            f"Document IPFS upload failed: "
                            f"{doc_result.get('error')}"
                        )

                if photo_file:
                    photo_result = upload_photo_to_ipfs(
                        photo_file,
                        credential.practitioner_name
                    )
                    if photo_result['success']:
                        ipfs_photo_hash = photo_result['ipfs_hash']
                        credential.ipfs_photo_hash = ipfs_photo_hash
                        logger.info(
                            f"Photo uploaded to IPFS: {ipfs_photo_hash}"
                        )
                    else:
                        logger.warning(
                            f"Photo IPFS upload failed: "
                            f"{photo_result.get('error')}"
                        )

                # Save IPFS hashes to database
                credential.save()

                # ── Step 2: Record on blockchain ──
                from blockchain.utils import issue_credential_on_chain

                blockchain_result = issue_credential_on_chain(
                    license_number=credential.license_number,
                    practitioner_name=credential.practitioner_name,
                    practitioner_id=credential.practitioner_id,
                    qualification=credential.qualification,
                    ipfs_document_hash=ipfs_document_hash,
                    ipfs_photo_hash=ipfs_photo_hash,
                )

                if blockchain_result['success']:
                    credential.blockchain_tx_hash = (
                        blockchain_result['tx_hash']
                    )
                    credential.blockchain_recorded_at = timezone.now()
                    credential.save()
                    logger.info(
                        f"Credential recorded on blockchain: "
                        f"{credential.license_number}"
                    )

                messages.success(
                    request,
                    f'Credential for {credential.practitioner_name} '
                    f'registered successfully. '
                    + ('✅ Recorded on blockchain.'
                       if blockchain_result['success']
                       else '⚠️ Blockchain recording pending.')
                )
                return redirect('credentials:all')

            except Exception as e:
                logger.error(f"Credential registration error: {str(e)}")
                messages.error(
                    request,
                    'An error occurred. Please try again.'
                )

    return render(request, 'issuer/register_credential.html', {
        'form': form,
        'page_title': 'Register New Credential'
    })


# ───────────────────────────────────────────
# VERIFY CREDENTIAL VIEW
# ───────────────────────────────────────────

@login_required
def verify_credential_view(request):
    if request.user.role != Role.VERIFIER and not request.user.is_superuser:
        messages.error(
            request,
            'You do not have permission to verify credentials.'
        )
        return redirect('accounts:dashboard')

    form = CredentialVerificationForm()
    verification_result = None

    if request.method == 'POST':
        form = CredentialVerificationForm(request.POST)
        if form.is_valid():
            license_number = form.cleaned_data['license_number']
            credential = None

            try:
                # ── Step 1: Look up in Django database ──
                credential = Credential.objects.get(
                    license_number=license_number
                )

                # ── Step 2: Verify on blockchain ──
                from blockchain.utils import verify_credential_on_chain

                blockchain_result = verify_credential_on_chain(
                    license_number
                )

                blockchain_verified = (
                    blockchain_result['success'] and
                    blockchain_result.get('exists', False) and
                    blockchain_result.get('is_active', False)
                )

                # ── Step 3: Check credential status ──
                if credential.status == CredentialStatus.REVOKED:
                    result = 'REVOKED'
                    verification_result = {
                        'status': 'revoked',
                        'message': 'This credential has been revoked.',
                        'credential': credential,
                    }
                elif credential.status == CredentialStatus.EXPIRED:
                    result = 'FAILED'
                    verification_result = {
                        'status': 'expired',
                        'message': 'This credential has expired.',
                        'credential': credential,
                    }
                else:
                    result = 'SUCCESS'
                    verification_result = {
                        'status': 'success',
                        'message': 'Credential verified successfully.',
                        'credential': credential,
                        'blockchain_verified': blockchain_verified,
                    }

            except Credential.DoesNotExist:
                result = 'NOT_FOUND'
                verification_result = {
                    'status': 'not_found',
                    'message': (
                        'No credential found with this license number. '
                        'This practitioner may not be registered '
                        'or the license number may be incorrect.'
                    ),
                }
                blockchain_verified = False

            # ── Step 4: Log verification attempt ──
            log = VerificationLog.objects.create(
                credential=credential,
                queried_credential_id=license_number,
                verified_by=request.user,
                result=result,
                blockchain_verified=blockchain_verified
                if 'blockchain_verified' in locals() else False,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

            # ── Step 5: Run AI fraud detection ──
            from fraud_detection.predict import predict_fraud

            fraud_result = predict_fraud(log)
            log.flagged_as_suspicious = fraud_result['is_suspicious']
            log.fraud_score = fraud_result['fraud_score']
            log.save()

            if fraud_result['is_suspicious']:
                logger.warning(
                    f"Suspicious verification flagged: "
                    f"{license_number} | "
                    f"score={fraud_result['fraud_score']}"
                )

    return render(request, 'verifier/verify_credential.html', {
        'form': form,
        'verification_result': verification_result,
        'page_title': 'Verify Credential',
    })


# ───────────────────────────────────────────
# REVOKE CREDENTIAL VIEW
# ───────────────────────────────────────────

@login_required
def revoke_credential_view(request, credential_id):
    if request.user.role != Role.ADMIN and not request.user.is_superuser:
        messages.error(
            request,
            'You do not have permission to revoke credentials.'
        )
        return redirect('accounts:dashboard')

    credential = get_object_or_404(
        Credential,
        credential_id=credential_id
    )

    if request.method == 'POST':
        # Revoke on blockchain first
        from blockchain.utils import revoke_credential_on_chain

        blockchain_result = revoke_credential_on_chain(
            credential.license_number
        )

        # Revoke in database regardless of blockchain result
        credential.status = CredentialStatus.REVOKED
        credential.save()

        if blockchain_result['success']:
            messages.success(
                request,
                f'Credential for {credential.practitioner_name} '
                f'revoked successfully on blockchain and system.'
            )
        else:
            messages.warning(
                request,
                f'Credential revoked in system. '
                f'Blockchain revocation pending: '
                f'{blockchain_result.get("error", "Unknown error")}'
            )

        return redirect('credentials:all')

    return render(request, 'admin/revoke_credential.html', {
        'credential': credential,
        'page_title': 'Revoke Credential',
    })


# ───────────────────────────────────────────
# ALL CREDENTIALS VIEW
# ───────────────────────────────────────────

@login_required
def all_credentials_view(request):
    user = request.user

    # Admins see all credentials
    if user.is_superuser or user.role == Role.ADMIN:
        credentials = Credential.objects.all()

    # Issuers only see credentials they issued
    elif user.role == Role.ISSUER:
        credentials = Credential.objects.filter(issued_by=user)

    # Verifiers should not access this page
    else:
        messages.error(
            request,
            'You do not have permission to view this page.'
        )
        return redirect('accounts:dashboard')

    return render(request, 'admin/all_credentials.html', {
        'credentials': credentials,
        'page_title': 'All Credentials',
    })