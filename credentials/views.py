"""
credentials/views.py
Handles credential issuance, verification and revocation
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.http import JsonResponse
from django.db.models import Q
from .models import Credential, VerificationLog, CredentialStatus
from .forms import CredentialRegistrationForm, CredentialVerificationForm, CredentialRenewalForm
from accounts.models import Role
import logging
import io
import base64

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

                # Email confirmation to the issuer
                from credentials.notifications import send_credential_issued_email
                send_credential_issued_email(credential)

                from accounts.models import log_action
                log_action(request.user, 'CREDENTIAL_ISSUED', target=credential, request=request)

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

        from accounts.models import log_action
        log_action(request.user, 'CREDENTIAL_REVOKED', target=credential, request=request)

        # Email the original issuer about the revocation
        from credentials.notifications import send_credential_revoked_email
        send_credential_revoked_email(credential)

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
    import csv
    from django.http import StreamingHttpResponse

    user = request.user

    # Admins see all credentials; issuers only see their own
    if user.is_superuser or user.role == Role.ADMIN:
        base_qs = Credential.objects.all()
    elif user.role == Role.ISSUER:
        base_qs = Credential.objects.filter(issued_by=user)
    else:
        messages.error(request, 'You do not have permission to view this page.')
        return redirect('accounts:dashboard')

    # ── Filters ──
    search_query   = request.GET.get('q', '').strip()
    status_filter  = request.GET.get('status', '').strip().upper()
    qual_filter    = request.GET.get('qualification', '').strip()
    inst_filter    = request.GET.get('institution', '').strip()
    date_from      = request.GET.get('date_from', '').strip()
    date_to        = request.GET.get('date_to', '').strip()

    credentials = base_qs

    if search_query:
        credentials = credentials.filter(
            Q(practitioner_name__icontains=search_query) |
            Q(license_number__icontains=search_query) |
            Q(practitioner_id__icontains=search_query) |
            Q(institution_of_study__icontains=search_query)
        )

    if status_filter in ('ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING'):
        credentials = credentials.filter(status=status_filter)

    if qual_filter:
        credentials = credentials.filter(qualification__icontains=qual_filter)

    if inst_filter:
        credentials = credentials.filter(institution_of_study__icontains=inst_filter)

    if date_from:
        try:
            credentials = credentials.filter(created_at__date__gte=date_from)
        except ValueError:
            pass

    if date_to:
        try:
            credentials = credentials.filter(created_at__date__lte=date_to)
        except ValueError:
            pass

    # Dropdown option lists (from unfiltered base so they don't shrink)
    qualifications = (
        base_qs.values_list('qualification', flat=True)
        .distinct().order_by('qualification')
    )
    institutions = (
        base_qs.values_list('institution_of_study', flat=True)
        .distinct().order_by('institution_of_study')
    )

    # ── CSV Export ──
    if request.GET.get('export') == 'csv':
        def _rows(qs):
            yield [
                'Credential ID', 'Practitioner Name', 'Practitioner ID',
                'Date of Birth', 'Qualification', 'Specialization',
                'Institution of Study', 'Year of Graduation',
                'License Number', 'License Expiry Date', 'Status',
                'Blockchain TX Hash', 'IPFS Document Hash', 'IPFS Photo Hash',
                'Issued By', 'Registered On',
            ]
            for c in qs.select_related('issued_by'):
                yield [
                    str(c.credential_id),
                    c.practitioner_name,
                    c.practitioner_id,
                    str(c.date_of_birth) if c.date_of_birth else '',
                    c.qualification,
                    c.specialization or '',
                    c.institution_of_study,
                    str(c.year_of_graduation),
                    c.license_number,
                    str(c.license_expiry_date),
                    c.status,
                    c.blockchain_tx_hash or '',
                    c.ipfs_document_hash or '',
                    c.ipfs_photo_hash or '',
                    c.issued_by.username if c.issued_by else '',
                    c.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                ]

        class _Echo:
            def write(self, value): return value

        writer = csv.writer(_Echo())
        streamed = (writer.writerow(row) for row in _rows(credentials))
        response = StreamingHttpResponse(streamed, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="verifydoc_credentials.csv"'
        return response

    any_filter = any([search_query, status_filter, qual_filter, inst_filter, date_from, date_to])
    total_count = credentials.count()

    from django.core.paginator import Paginator
    paginator = Paginator(credentials, 25)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, 'admin/all_credentials.html', {
        'credentials': page_obj,
        'page_obj': page_obj,
        'qualifications': qualifications,
        'institutions': institutions,
        'search_query': search_query,
        'status_filter': status_filter,
        'qual_filter': qual_filter,
        'inst_filter': inst_filter,
        'date_from': date_from,
        'date_to': date_to,
        'any_filter': any_filter,
        'total_count': total_count,
        'page_title': 'All Credentials',
    })


# ───────────────────────────────────────────
# CREDENTIAL DETAIL VIEW
# ───────────────────────────────────────────

@login_required
def credential_detail_view(request, credential_id):
    user = request.user
    credential = get_object_or_404(Credential, credential_id=credential_id)

    # Admins and superusers see all; issuers only see credentials they issued
    if not (user.is_superuser or user.role == Role.ADMIN):
        if not (user.role == Role.ISSUER and credential.issued_by == user):
            messages.error(request, 'You do not have permission to view this credential.')
            return redirect('accounts:dashboard')

    document_url = None
    photo_url = None
    etherscan_url = None

    if credential.ipfs_document_hash:
        document_url = (
            f"https://gateway.pinata.cloud/ipfs/{credential.ipfs_document_hash}"
        )
    if credential.ipfs_photo_hash:
        photo_url = (
            f"https://gateway.pinata.cloud/ipfs/{credential.ipfs_photo_hash}"
        )
    if credential.blockchain_tx_hash:
        etherscan_url = (
            f"https://sepolia.etherscan.io/tx/{credential.blockchain_tx_hash}"
        )

    can_revoke = (
        credential.status == 'ACTIVE' and
        (user.is_superuser or user.role == Role.ADMIN)
    )
    can_renew = (
        credential.status != CredentialStatus.REVOKED and
        (
            (user.role == Role.ISSUER and credential.issued_by == user) or
            user.is_superuser or
            user.role == Role.ADMIN
        )
    )

    return render(request, 'credentials/detail.html', {
        'credential': credential,
        'document_url': document_url,
        'photo_url': photo_url,
        'etherscan_url': etherscan_url,
        'can_revoke': can_revoke,
        'can_renew': can_renew,
        'page_title': f'Credential — {credential.practitioner_name}',
    })


# ───────────────────────────────────────────
# PUBLIC EMPLOYER VERIFICATION VIEWS
# No login required — open to anyone
# ───────────────────────────────────────────

# ───────────────────────────────────────────
# CERTIFICATE PDF DOWNLOAD
# ───────────────────────────────────────────

@login_required
def certificate_view(request, credential_id):
    """Generate and return a PDF verification certificate for a credential."""
    from django.http import HttpResponse
    user = request.user
    credential = get_object_or_404(Credential, credential_id=credential_id)

    # Same access rules as detail view
    if not (user.is_superuser or user.role == Role.ADMIN):
        if not (user.role == Role.ISSUER and credential.issued_by == user):
            if user.role != Role.VERIFIER:
                messages.error(request, 'You do not have permission to download this certificate.')
                return redirect('accounts:dashboard')

    from credentials.pdf_utils import generate_certificate_pdf
    from django.conf import settings as django_settings

    site_url = getattr(django_settings, 'SITE_URL', 'http://127.0.0.1:8000')

    try:
        pdf_bytes = generate_certificate_pdf(
            credential=credential,
            generated_by_user=user,
            site_url=site_url,
        )
    except Exception as e:
        logger.error(f"PDF generation failed for {credential_id}: {e}")
        messages.error(request, 'Certificate generation failed. Please try again.')
        return redirect('credentials:detail', credential_id=credential_id)

    filename = f"VerifyDoc_{credential.license_number}_{credential.practitioner_name.replace(' ', '_')}.pdf"
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ───────────────────────────────────────────
# BLOCKCHAIN STATUS ENDPOINT (AJAX/JSON)
# ───────────────────────────────────────────

@login_required
def blockchain_status_view(request, credential_id):
    """
    GET /credentials/<id>/blockchain-status/
    Returns live confirmation count for a credential's tx hash.
    Called asynchronously by the detail page — keeps page load fast.
    """
    credential = get_object_or_404(Credential, credential_id=credential_id)

    user = request.user
    if not (user.is_superuser or user.role == Role.ADMIN):
        if not (user.role == Role.ISSUER and credential.issued_by == user):
            if user.role != Role.VERIFIER:
                return JsonResponse({'error': 'forbidden'}, status=403)

    if not credential.blockchain_tx_hash:
        return JsonResponse({'recorded': False})

    from blockchain.utils import get_tx_status
    result = get_tx_status(credential.blockchain_tx_hash)

    confirmations = result.get('confirmations', 0)
    if confirmations >= 100:
        level = 'deep'
        label = f'{confirmations:,} confirmations — Deeply confirmed'
    elif confirmations >= 12:
        level = 'confirmed'
        label = f'{confirmations} confirmations — Confirmed'
    elif result.get('pending'):
        level = 'pending'
        label = 'Pending — awaiting inclusion'
    elif not result.get('success'):
        level = 'unavailable'
        label = 'Status unavailable (node unreachable)'
    else:
        level = 'confirming'
        label = f'{confirmations} confirmation{"s" if confirmations != 1 else ""} — Confirming…'

    return JsonResponse({
        'recorded': True,
        'success': result.get('success', False),
        'pending': result.get('pending', False),
        'confirmations': confirmations,
        'tx_block': result.get('tx_block'),
        'current_block': result.get('current_block'),
        'tx_status': result.get('status', 1),
        'level': level,
        'label': label,
        'etherscan_url': f"https://sepolia.etherscan.io/tx/{credential.blockchain_tx_hash}",
    })


# ───────────────────────────────────────────
# RENEW CREDENTIAL VIEW
# ───────────────────────────────────────────

@login_required
def renew_credential_view(request, credential_id):
    """Allow issuers to renew an active or expired credential."""
    user = request.user
    credential = get_object_or_404(Credential, credential_id=credential_id)

    # Only the issuer who owns it, or an admin, can renew
    if not (user.is_superuser or user.role == Role.ADMIN):
        if not (user.role == Role.ISSUER and credential.issued_by == user):
            messages.error(request, 'You do not have permission to renew this credential.')
            return redirect('accounts:dashboard')

    # Cannot renew a revoked credential
    if credential.status == CredentialStatus.REVOKED:
        messages.error(request, 'Revoked credentials cannot be renewed.')
        return redirect('credentials:detail', credential_id=credential_id)

    form = CredentialRenewalForm()

    if request.method == 'POST':
        form = CredentialRenewalForm(request.POST, request.FILES)
        if form.is_valid():
            new_expiry = form.cleaned_data['new_expiry_date']
            updated_doc = form.cleaned_data.get('updated_document')

            try:
                # Upload new document to IPFS if provided
                if updated_doc:
                    from ipfs.pinata_utils import upload_document_to_ipfs
                    doc_result = upload_document_to_ipfs(
                        updated_doc,
                        credential.practitioner_name
                    )
                    if doc_result['success']:
                        credential.ipfs_document_hash = doc_result['ipfs_hash']
                        logger.info(f"Renewed document uploaded to IPFS: {doc_result['ipfs_hash']}")
                    else:
                        logger.warning(f"IPFS document upload failed on renewal: {doc_result.get('error')}")

                # Update credential fields
                credential.license_expiry_date = new_expiry
                credential.status = CredentialStatus.ACTIVE
                credential.renewal_count += 1
                credential.last_renewed_at = timezone.now()
                credential.save()

                # Try to re-record on blockchain (may not be supported by contract)
                try:
                    from blockchain.utils import issue_credential_on_chain
                    blockchain_result = issue_credential_on_chain(
                        license_number=credential.license_number,
                        practitioner_name=credential.practitioner_name,
                        practitioner_id=credential.practitioner_id,
                        qualification=credential.qualification,
                        ipfs_document_hash=credential.ipfs_document_hash or '',
                        ipfs_photo_hash=credential.ipfs_photo_hash or '',
                    )
                    if blockchain_result.get('success'):
                        credential.blockchain_tx_hash = blockchain_result['tx_hash']
                        credential.blockchain_recorded_at = timezone.now()
                        credential.save(update_fields=['blockchain_tx_hash', 'blockchain_recorded_at'])
                        logger.info(f"Renewal recorded on blockchain: {credential.license_number}")
                except Exception as bc_err:
                    logger.warning(f"Blockchain renewal recording skipped: {bc_err}")

                # Send renewal email
                from credentials.notifications import send_credential_renewed_email
                send_credential_renewed_email(credential)

                from accounts.models import log_action
                log_action(request.user, 'CREDENTIAL_RENEWED', target=credential, request=request)

                messages.success(
                    request,
                    f'Credential for {credential.practitioner_name} renewed successfully. '
                    f'New expiry: {new_expiry.strftime("%d %b %Y")}. '
                    f'Renewal #{credential.renewal_count}.'
                )
                return redirect('credentials:detail', credential_id=credential_id)

            except Exception as e:
                logger.error(f"Credential renewal error: {e}")
                messages.error(request, 'An error occurred during renewal. Please try again.')

    return render(request, 'issuer/renew_credential.html', {
        'form': form,
        'credential': credential,
        'page_title': f'Renew — {credential.practitioner_name}',
    })


def public_search_view(request):
    """
    Public landing page where employers/hospitals enter a license number or name.
    No login required.
    """
    license_number = ''
    name_query = ''
    name_results = None

    if request.method == 'POST':
        search_type = request.POST.get('search_type', 'license')

        if search_type == 'name':
            name_query = request.POST.get('name_query', '').strip()
            if name_query:
                name_results = (
                    Credential.objects
                    .filter(practitioner_name__icontains=name_query)
                    .only(
                        'credential_id', 'practitioner_name', 'qualification',
                        'institution_of_study', 'license_number', 'status',
                        'license_expiry_date',
                    )
                    .order_by('practitioner_name')[:20]
                )
        else:
            license_number = request.POST.get('license_number', '').strip().upper()
            if license_number:
                return redirect('public_result', license_number=license_number)

    return render(request, 'public/verify_search.html', {
        'license_number': license_number,
        'name_query': name_query,
        'name_results': name_results,
    })


def public_result_view(request, license_number):
    """
    Public credential result page for a given license number.
    Shows full credential details, blockchain status, photo, and QR code.
    No login required.
    """
    import qrcode

    context = {
        'license_number': license_number,
        'status': None,
        'credential': None,
        'blockchain': None,
        'qr_code': None,
        'photo_url': None,
    }

    try:
        credential = Credential.objects.get(license_number=license_number)
        context['credential'] = credential

        if credential.status == CredentialStatus.REVOKED:
            context['status'] = 'revoked'
        elif credential.status == CredentialStatus.EXPIRED:
            context['status'] = 'expired'
        else:
            context['status'] = 'active'

        # Blockchain verification
        from blockchain.utils import verify_credential_on_chain
        blockchain = verify_credential_on_chain(license_number)
        context['blockchain'] = blockchain

        # IPFS photo URL (for visual identity check)
        if credential.ipfs_photo_hash:
            context['photo_url'] = (
                f"https://gateway.pinata.cloud/ipfs/{credential.ipfs_photo_hash}"
            )

        # QR code pointing to this result page
        page_url = request.build_absolute_uri()
        qr = qrcode.QRCode(version=1, box_size=6, border=3,
                           error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(page_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='#1F3864', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        context['qr_code'] = base64.b64encode(buf.getvalue()).decode()

        # Log this anonymous verification attempt
        result_code = (
            'SUCCESS' if context['status'] == 'active'
            else context['status'].upper()
        )
        blockchain_ok = (
            bool(blockchain.get('success')) and
            bool(blockchain.get('is_active', False))
        )
        VerificationLog.objects.create(
            credential=credential,
            queried_credential_id=license_number,
            verified_by=None,
            result=result_code,
            blockchain_verified=blockchain_ok,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

    except Credential.DoesNotExist:
        context['status'] = 'not_found'

    return render(request, 'public/verify_result.html', context)