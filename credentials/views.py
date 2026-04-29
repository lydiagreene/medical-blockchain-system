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
        messages.error(request, 'You do not have permission to issue credentials.')
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

                # Now record on blockchain
                from blockchain.utils import issue_credential_on_chain
                from django.utils import timezone

                blockchain_result = issue_credential_on_chain(
                    license_number=credential.license_number,
                    practitioner_name=credential.practitioner_name,
                    practitioner_id=credential.practitioner_id,
                    qualification=credential.qualification,
                    ipfs_document_hash=credential.ipfs_document_hash or '',
                    ipfs_photo_hash=credential.ipfs_photo_hash or '',
                )

                if blockchain_result['success']:
                    # Save blockchain details to database
                    credential.blockchain_tx_hash = blockchain_result['tx_hash']
                    credential.blockchain_recorded_at = timezone.now()
                    credential.save()
                    logger.info(
                        f"Credential recorded on blockchain: "
                        f"{credential.license_number}"
                    )
                else:
                    logger.warning(
                        f"Blockchain recording failed for "
                        f"{credential.license_number}: "
                        f"{blockchain_result.get('error')}"
                    )

                messages.success(
                    request,
                    f'Credential for {credential.practitioner_name} '
                    f'registered successfully.'
                    + (' Recorded on blockchain.' 
                       if blockchain_result['success'] 
                       else ' Note: Blockchain recording pending.')
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
    # Only verifiers can access this view
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

            try:
                # Look up the credential
                credential = Credential.objects.get(
                    license_number=license_number
                )

                # Check if credential is active
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

            # Log this verification attempt
            VerificationLog.objects.create(
                credential=credential if 'credential' in locals() else None,
                queried_credential_id=license_number,
                verified_by=request.user,
                result=result,
                blockchain_verified=False,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
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
        messages.error(request, 'You do not have permission to revoke credentials.')
        return redirect('accounts:dashboard')

    credential = get_object_or_404(Credential, credential_id=credential_id)

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
                f'revoked successfully on blockchain.'
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
        messages.error(request, 'You do not have permission to view this page.')
        return redirect('accounts:dashboard')

    return render(request, 'admin/all_credentials.html', {
        'credentials': credentials,
        'page_title': 'All Credentials',
    })