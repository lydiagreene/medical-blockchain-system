"""
api/auth_views.py
Authentication, user-info, stats, and profile endpoints for the React frontend.
"""

from datetime import timedelta
from django.contrib.auth import authenticate
from django.db.models import Count
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .throttles import LoginRateThrottle, PasswordResetRateThrottle

from accounts.models import CustomUser, Role, Institution, log_action
from credentials.models import Credential, CredentialStatus, VerificationLog


def _set_auth_cookie(response, token_key, expiry_hours):
    """Attach the auth token as an HttpOnly, SameSite=Lax cookie."""
    from django.conf import settings
    response.set_cookie(
        'auth_token',
        token_key,
        max_age=expiry_hours * 3600,
        httponly=True,
        secure=not settings.DEBUG,  # HTTPS-only in production
        samesite='Lax',
        path='/',
    )


def _clear_auth_cookie(response):
    response.delete_cookie('auth_token', path='/')


def _user_payload(user):
    # Prefer institution FK name; fall back to free-text field
    inst_name = user.institution.name if user.institution_id else user.institution_name
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'institution_id': user.institution_id,
        'institution_name': inst_name,
        'phone_number': user.phone_number,
        'is_approved': user.is_approved,
        'is_superuser': user.is_superuser,
        'date_joined': user.date_joined,
    }


def _monthly_chart(qs, months=6):
    """Returns (labels, data) for credential issuance per month."""
    now = timezone.now()
    rows = (
        qs.filter(created_at__gte=now - timedelta(days=months * 31))
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('credential_id'))
        .order_by('month')
    )
    counts = {(r['month'].year, r['month'].month): r['count'] for r in rows}
    labels, data = [], []
    year, month = now.year, now.month
    for _ in range(months):
        labels.insert(0, timezone.datetime(year, month, 1).strftime('%b %Y'))
        data.insert(0, counts.get((year, month), 0))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return labels, data


def _daily_chart(qs, days=30):
    """Returns (labels, data) for verifications per day."""
    start = timezone.now().date() - timedelta(days=days - 1)
    rows = (
        qs.filter(timestamp__date__gte=start)
        .annotate(day=TruncDate('timestamp'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    counts = {r['day']: r['count'] for r in rows}
    labels, data = [], []
    for i in range(days):
        d = start + timedelta(days=i)
        labels.append(d.strftime('%d %b'))
        data.append(counts.get(d, 0))
    return labels, data


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def api_login(request):
    from django.conf import settings as _s
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    if not username or not password:
        return Response({'detail': 'Username and password are required.'}, status=400)

    # Fetch user record first so we can check lockout before authenticating
    try:
        candidate = CustomUser.objects.get(username=username)
    except CustomUser.DoesNotExist:
        # Log the failure without revealing whether the username exists
        log_action(None, 'LOGIN_FAILED', notes=f'Unknown username: {username}', request=request)
        return Response({'detail': 'Invalid credentials.'}, status=400)

    # Check lockout
    if candidate.locked_until and candidate.locked_until > timezone.now():
        remaining = int((candidate.locked_until - timezone.now()).total_seconds() / 60) + 1
        return Response(
            {'detail': f'Account locked. Try again in {remaining} minute(s).', 'locked': True},
            status=403,
        )

    user = authenticate(username=username, password=password)
    if user is None:
        # Increment failed attempt counter
        candidate.failed_login_attempts += 1
        max_attempts = getattr(_s, 'LOGIN_MAX_ATTEMPTS', 10)
        lockout_mins = getattr(_s, 'LOGIN_LOCKOUT_MINS', 15)
        if candidate.failed_login_attempts >= max_attempts:
            candidate.locked_until = timezone.now() + timedelta(minutes=lockout_mins)
            candidate.save(update_fields=['failed_login_attempts', 'locked_until'])
            log_action(candidate, 'ACCOUNT_LOCKED',
                       notes=f'Locked after {candidate.failed_login_attempts} failed attempts.',
                       request=request)
            return Response(
                {'detail': f'Too many failed attempts. Account locked for {lockout_mins} minutes.', 'locked': True},
                status=403,
            )
        candidate.save(update_fields=['failed_login_attempts'])
        log_action(candidate, 'LOGIN_FAILED',
                   notes=f'Failed attempt #{candidate.failed_login_attempts}',
                   request=request)
        return Response({'detail': 'Invalid credentials.'}, status=400)

    if not user.is_approved and not user.is_superuser:
        return Response(
            {'detail': 'Your account is pending admin approval.', 'pending': True},
            status=403,
        )

    # Successful credential check — reset lockout counters
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(update_fields=['failed_login_attempts', 'locked_until'])

    # Issue partial token — full token only after 2FA step
    from .two_factor_views import make_partial_token
    partial_token = make_partial_token(user.pk)

    if user.totp_enabled:
        return Response({'requires_2fa': True, 'partial_token': partial_token})

    # First-ever login — user must complete 2FA setup before accessing the app
    return Response({'requires_2fa_setup': True, 'partial_token': partial_token})


@api_view(['POST'])
@permission_classes([AllowAny])
def api_register(request):
    username         = request.data.get('username', '').strip()
    email            = request.data.get('email', '').strip()
    password         = request.data.get('password', '').strip()
    role             = request.data.get('role', Role.VERIFIER)
    institution_id   = request.data.get('institution_id')
    institution_name = request.data.get('institution_name', '').strip()
    phone_number     = request.data.get('phone_number', '').strip()

    errors = {}
    if not username:
        errors['username'] = 'Username is required.'
    elif CustomUser.objects.filter(username=username).exists():
        errors['username'] = 'Username already taken.'
    if not email:
        errors['email'] = 'Email is required.'
    elif CustomUser.objects.filter(email=email).exists():
        errors['email'] = 'Email already in use.'
    if not password or len(password) < 8:
        errors['password'] = 'Password must be at least 8 characters.'
    if role not in [Role.ISSUER, Role.VERIFIER, Role.ADMIN]:
        errors['role'] = 'Invalid role selected.'

    # Resolve institution FK
    institution = None
    if institution_id:
        try:
            institution = Institution.objects.get(id=institution_id, is_active=True)
        except Institution.DoesNotExist:
            errors['institution_id'] = 'Selected institution not found or is inactive.'

    if errors:
        return Response(errors, status=400)

    # Derive display name from FK; fall back to free-text field
    resolved_name = institution.name if institution else institution_name

    user = CustomUser.objects.create_user(
        username=username, email=email, password=password,
        role=role,
        institution=institution,
        institution_name=resolved_name,
        phone_number=phone_number,
        is_approved=False,
    )
    try:
        from accounts.notifications import send_account_pending_admin_email
        send_account_pending_admin_email(user)
    except Exception:
        pass

    # Send email verification link
    try:
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.core.mail import send_mail
        from django.conf import settings as _s
        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(_s, 'FRONTEND_URL', 'http://localhost:5173')
        verify_link  = f"{frontend_url}/verify-email/{uid}/{token}/"
        send_mail(
            subject='Verify your VerifyDoc Uganda email',
            message=(
                f"Hi {user.username},\n\n"
                f"Please verify your email address:\n{verify_link}\n\n"
                f"— VerifyDoc Uganda"
            ),
            from_email=_s.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass

    return Response(
        {'detail': 'Account created. Please check your email to verify your address, then wait for admin approval.'},
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_me(request):
    return Response(_user_payload(request.user))


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def api_update_profile(request):
    user = request.user
    data = request.data

    email = data.get('email', '').strip()
    if email and email != user.email:
        if CustomUser.objects.filter(email=email).exclude(pk=user.pk).exists():
            return Response({'email': 'Email already in use.'}, status=400)
        user.email = email

    if data.get('institution_id') is not None:
        inst_id = data['institution_id']
        if inst_id:
            try:
                institution = Institution.objects.get(id=inst_id, is_active=True)
                user.institution = institution
                user.institution_name = institution.name
            except Institution.DoesNotExist:
                return Response({'institution_id': 'Institution not found or inactive.'}, status=400)
        else:
            user.institution = None
    elif data.get('institution_name') is not None:
        user.institution_name = data['institution_name'].strip()
    if data.get('phone_number') is not None:
        user.phone_number = data['phone_number'].strip()

    new_password = data.get('new_password', '').strip()
    if new_password:
        if len(new_password) < 8:
            return Response({'new_password': 'Password must be at least 8 characters.'}, status=400)
        old_password = data.get('old_password', '').strip()
        if not user.check_password(old_password):
            return Response({'old_password': 'Current password is incorrect.'}, status=400)
        user.set_password(new_password)
        Token.objects.filter(user=user).delete()
        token, _ = Token.objects.get_or_create(user=user)
        user.save()
        return Response({**_user_payload(user), 'new_token': token.key})

    user.save()
    return Response(_user_payload(user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    log_action(request.user, 'LOGOUT', request=request)
    response = Response({'detail': 'Logged out successfully.'})
    _clear_auth_cookie(response)
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def api_password_reset(request):
    """
    POST /api/v1/auth/password-reset/
    Body: { email }
    Always returns 200 to prevent email enumeration.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode
    from django.core.mail import send_mail
    from django.conf import settings

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'email': 'Email is required.'}, status=400)

    try:
        user = CustomUser.objects.get(email__iexact=email)
        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"

        send_mail(
            subject='Reset your VerifyDoc Uganda password',
            message=(
                f"Hi {user.username},\n\n"
                f"You requested a password reset for your VerifyDoc Uganda account.\n\n"
                f"Click the link below to set a new password (expires in 1 hour):\n"
                f"{reset_link}\n\n"
                f"If you did not request this, you can safely ignore this email.\n\n"
                f"— VerifyDoc Uganda"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        log_action(user, 'PASSWORD_RESET_REQUESTED', request=request)
    except CustomUser.DoesNotExist:
        pass  # Don't reveal whether the email exists

    return Response({'detail': 'If that email is registered, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def api_password_reset_confirm(request):
    """
    POST /api/v1/auth/password-reset-confirm/
    Body: { uid, token, new_password }
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_str
    from django.utils.http import urlsafe_base64_decode

    uid          = request.data.get('uid', '').strip()
    token        = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '').strip()

    if not uid or not token:
        return Response({'detail': 'Invalid reset link.'}, status=400)
    if not new_password or len(new_password) < 8:
        return Response({'new_password': 'Password must be at least 8 characters.'}, status=400)

    try:
        pk   = force_str(urlsafe_base64_decode(uid))
        user = CustomUser.objects.get(pk=pk)
    except (ValueError, TypeError, OverflowError, CustomUser.DoesNotExist):
        return Response({'detail': 'Invalid reset link.'}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response(
            {'detail': 'This reset link has expired or already been used. Please request a new one.'},
            status=400,
        )

    user.set_password(new_password)
    user.save()
    Token.objects.filter(user=user).delete()  # invalidate existing sessions
    log_action(user, 'PASSWORD_RESET_COMPLETED', request=request)

    return Response({'detail': 'Password reset successfully. You can now sign in.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def api_send_verification_email(request):
    """
    POST /api/v1/auth/send-verification/
    Sends (or re-sends) an email verification link to the authenticated
    or newly-registered user. Expects { email } in body or uses request.user.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode
    from django.core.mail import send_mail
    from django.conf import settings

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'email': 'Email is required.'}, status=400)

    try:
        user = CustomUser.objects.get(email__iexact=email)
    except CustomUser.DoesNotExist:
        return Response({'detail': 'If that email is registered, a verification link has been sent.'})

    if user.email_verified:
        return Response({'detail': 'Email is already verified.'})

    uid   = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    verify_link  = f"{frontend_url}/verify-email/{uid}/{token}/"

    send_mail(
        subject='Verify your VerifyDoc Uganda email',
        message=(
            f"Hi {user.username},\n\n"
            f"Please verify your email address by clicking the link below:\n"
            f"{verify_link}\n\n"
            f"This link expires in 24 hours.\n\n"
            f"— VerifyDoc Uganda"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )

    return Response({'detail': 'If that email is registered, a verification link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def api_verify_email(request):
    """
    POST /api/v1/auth/verify-email/
    Body: { uid, token }
    Marks the user's email as verified.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_str
    from django.utils.http import urlsafe_base64_decode

    uid   = request.data.get('uid', '').strip()
    token = request.data.get('token', '').strip()

    if not uid or not token:
        return Response({'detail': 'Invalid verification link.'}, status=400)

    try:
        pk   = force_str(urlsafe_base64_decode(uid))
        user = CustomUser.objects.get(pk=pk)
    except (ValueError, TypeError, OverflowError, CustomUser.DoesNotExist):
        return Response({'detail': 'Invalid verification link.'}, status=400)

    if user.email_verified:
        return Response({'detail': 'Email already verified.'})

    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'Verification link has expired. Please request a new one.'}, status=400)

    user.email_verified = True
    user.save(update_fields=['email_verified'])
    log_action(user, 'EMAIL_VERIFIED', request=request)

    return Response({'detail': 'Email verified successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_stats(request):
    user = request.user
    role = Role.ADMIN if user.is_superuser else user.role

    if role == Role.ADMIN:
        qs = Credential.objects.all()
        vq = VerificationLog.objects.all()
        today = timezone.now().date()
        today_fraud = VerificationLog.objects.filter(
            flagged_as_suspicious=True, timestamp__date=today
        ).count()

        monthly_labels, monthly_data = _monthly_chart(qs)
        daily_labels, daily_data = _daily_chart(vq)

        recent = list(
            qs.order_by('-created_at')[:6].values(
                'credential_id', 'practitioner_name', 'qualification',
                'license_number', 'status', 'created_at',
            )
        )
        for r in recent:
            r['credential_id'] = str(r['credential_id'])

        expiring_soon = qs.filter(
            status=CredentialStatus.ACTIVE,
            license_expiry_date__lte=today + timedelta(days=30),
        ).count()

        return Response({
            'total_credentials': qs.count(),
            'active_credentials': qs.filter(status=CredentialStatus.ACTIVE).count(),
            'revoked_credentials': qs.filter(status=CredentialStatus.REVOKED).count(),
            'expired_credentials': qs.filter(status=CredentialStatus.EXPIRED).count(),
            'pending_users': CustomUser.objects.filter(is_approved=False, is_superuser=False).count(),
            'today_fraud_flags': today_fraud,
            'expiring_soon': expiring_soon,
            'total_verifications': vq.count(),
            'recent_credentials': recent,
            'chart_monthly_labels': monthly_labels,
            'chart_monthly_data': monthly_data,
            'chart_daily_labels': daily_labels,
            'chart_daily_data': daily_data,
        })

    elif role == Role.ISSUER:
        qs = Credential.objects.filter(issued_by=user)
        monthly_labels, monthly_data = _monthly_chart(qs)

        recent = list(
            qs.order_by('-created_at')[:6].values(
                'credential_id', 'practitioner_name', 'qualification',
                'license_number', 'status', 'created_at',
            )
        )
        for r in recent:
            r['credential_id'] = str(r['credential_id'])

        return Response({
            'total_credentials': qs.count(),
            'active_credentials': qs.filter(status=CredentialStatus.ACTIVE).count(),
            'revoked_credentials': qs.filter(status=CredentialStatus.REVOKED).count(),
            'expired_credentials': qs.filter(status=CredentialStatus.EXPIRED).count(),
            'recent_credentials': recent,
            'chart_monthly_labels': monthly_labels,
            'chart_monthly_data': monthly_data,
        })

    elif role == Role.VERIFIER:
        vq = VerificationLog.objects.filter(verified_by=user)
        daily_labels, daily_data = _daily_chart(vq)

        return Response({
            'total_verifications': vq.count(),
            'successful_verifications': vq.filter(result='SUCCESS').count(),
            'failed_verifications': vq.exclude(result='SUCCESS').count(),
            'chart_daily_labels': daily_labels,
            'chart_daily_data': daily_data,
        })

    return Response({})
