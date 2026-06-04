"""
api/admin_views.py
Admin-only endpoints: user management and audit log.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from django.utils import timezone
from accounts.models import CustomUser, Role, AuditLog, log_action
from credentials.models import VerificationLog


def _is_admin(user):
    return user.is_superuser or user.role == Role.ADMIN


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_users(request):
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    users = list(
        CustomUser.objects.filter(is_approved=False, is_superuser=False)
        .order_by('-date_joined')
        .values('id', 'username', 'email', 'role', 'institution_name',
                'phone_number', 'date_joined', 'email_verified')
    )
    return Response(users)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_users(request):
    """GET /api/v1/admin/users/all/ — returns all non-superuser accounts."""
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    q = request.query_params.get('q', '').strip()
    qs = CustomUser.objects.filter(is_superuser=False).order_by('-date_joined')
    if q:
        qs = qs.filter(username__icontains=q) | CustomUser.objects.filter(
            email__icontains=q, is_superuser=False
        )

    users = list(
        qs.values('id', 'username', 'email', 'role', 'institution_name',
                  'phone_number', 'date_joined', 'is_approved',
                  'totp_enabled', 'email_verified', 'locked_until',
                  'failed_login_attempts')
    )
    return Response(users)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_user(request, user_id):
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    user = get_object_or_404(CustomUser, id=user_id)
    user.is_approved = True
    user.save(update_fields=['is_approved'])

    try:
        log_action(request.user, 'USER_APPROVED', target=user, request=request)
    except Exception:
        pass

    try:
        from accounts.notifications import send_account_approved_email
        send_account_approved_email(user)
    except Exception:
        pass

    return Response({'detail': f'{user.username} approved successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_user(request, user_id):
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    user = get_object_or_404(CustomUser, id=user_id)
    username = user.username

    try:
        log_action(request.user, 'USER_REJECTED', target=user, request=request)
    except Exception:
        pass

    try:
        from accounts.notifications import send_account_rejected_email
        send_account_rejected_email(user)
    except Exception:
        pass

    user.delete()
    return Response({'detail': f'{username} rejected and removed.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_user_totp(request, user_id):
    """
    POST /api/v1/admin/users/<id>/reset-2fa/
    Resets a user's 2FA so they must complete setup on next login.
    Also invalidates their existing auth token.
    """
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    user = get_object_or_404(CustomUser, id=user_id)
    if user.is_superuser:
        return Response({'detail': 'Cannot reset 2FA for superusers.'}, status=400)

    user.totp_secret       = None
    user.totp_enabled      = False
    user.totp_backup_codes = None
    user.save(update_fields=['totp_secret', 'totp_enabled', 'totp_backup_codes'])

    # Invalidate existing auth token so they must log in fresh
    Token.objects.filter(user=user).delete()

    log_action(request.user, 'TOTP_RESET', target=user,
               notes=f'Reset by admin {request.user.username}', request=request)

    return Response({'detail': f"2FA reset for {user.username}. They must complete 2FA setup on next login."})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlock_user(request, user_id):
    """POST /api/v1/admin/users/<id>/unlock/ — clears account lockout."""
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    user = get_object_or_404(CustomUser, id=user_id)
    user.failed_login_attempts = 0
    user.locked_until          = None
    user.save(update_fields=['failed_login_attempts', 'locked_until'])

    log_action(request.user, 'USER_APPROVED', target=user,
               notes='Manually unlocked by admin', request=request)

    return Response({'detail': f"{user.username}'s account has been unlocked."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log(request):
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    page = max(1, int(request.query_params.get('page', 1)))
    page_size = 20
    offset = (page - 1) * page_size

    qs = AuditLog.objects.select_related('actor').order_by('-timestamp')

    # Optional filters
    actor_q = request.query_params.get('actor', '').strip()
    action_q = request.query_params.get('action', '').strip()
    date_from = request.query_params.get('date_from', '').strip()
    date_to = request.query_params.get('date_to', '').strip()

    if actor_q:
        qs = qs.filter(actor__username__icontains=actor_q)
    if action_q:
        qs = qs.filter(action=action_q)
    if date_from:
        qs = qs.filter(timestamp__date__gte=date_from)
    if date_to:
        qs = qs.filter(timestamp__date__lte=date_to)

    total = qs.count()
    entries = [
        {
            'id': e.id,
            'action': e.action,
            'action_display': e.get_action_display(),
            'actor': e.actor.username if e.actor else 'system',
            'target_description': e.target_description,
            'notes': e.notes,
            'timestamp': e.timestamp,
        }
        for e in qs[offset: offset + page_size]
    ]

    return Response({'count': total, 'results': entries})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fraud_dashboard(request):
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=403)

    page = max(1, int(request.query_params.get('page', 1)))
    page_size = 20
    offset = (page - 1) * page_size

    today = timezone.now().date()
    qs = VerificationLog.objects.filter(flagged_as_suspicious=True).select_related(
        'verified_by', 'credential'
    ).order_by('-timestamp')

    total = qs.count()
    today_count = qs.filter(timestamp__date=today).count()

    entries = [
        {
            'id': e.id,
            'queried_credential_id': e.queried_credential_id,
            'result': e.result,
            'verified_by': e.verified_by.username if e.verified_by else 'public',
            'ip_address': e.ip_address,
            'timestamp': e.timestamp,
            'practitioner_name': e.credential.practitioner_name if e.credential else None,
        }
        for e in qs[offset: offset + page_size]
    ]

    return Response({
        'total_flagged': total,
        'today_flagged': today_count,
        'count': total,
        'results': entries,
    })
