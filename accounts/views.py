"""
accounts/views.py
Handles login, logout, registration and dashboard routing
"""

import json
from datetime import timedelta
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate, TruncMonth
from .forms import LoginForm, RegistrationForm, ProfileForm, PasswordChangeForm
from .models import Role, CustomUser, AuditLog, log_action


def _verif_by_day(queryset, days=30):
    """(labels, data) for verification counts per day over last N days."""
    start = timezone.now().date() - timedelta(days=days - 1)
    rows = (
        queryset
        .filter(timestamp__date__gte=start)
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


def _creds_by_month(queryset, months=6):
    """(labels, data) for credential counts per month over last N months."""
    now = timezone.now()
    rows = (
        queryset
        .filter(created_at__gte=now - timedelta(days=months * 31))
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('credential_id'))
        .order_by('month')
    )
    month_counts = {(r['month'].year, r['month'].month): r['count'] for r in rows}
    labels, data = [], []
    year, month = now.year, now.month
    for _ in range(months):
        labels.insert(0, timezone.datetime(year, month, 1).strftime('%b %Y'))
        data.insert(0, month_counts.get((year, month), 0))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return labels, data


# ───────────────────────────────────────────
# LOGIN VIEW
# ───────────────────────────────────────────

def login_view(request):
    # If already logged in redirect to dashboard
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    form = LoginForm()

    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)

            if user is not None:
                # Check if account is approved
                if not user.is_approved and not user.is_superuser:
                    messages.warning(
                        request,
                        'Your account is pending approval by an administrator.'
                    )
                    return redirect('accounts:pending_approval')

                login(request, user)
                messages.success(request, f'Welcome back, {user.username}!')
                return redirect('accounts:dashboard')
            else:
                messages.error(
                    request,
                    'Invalid username or password. Please try again.'
                )

    return render(request, 'accounts/login.html', {'form': form})


# ───────────────────────────────────────────
# LOGOUT VIEW
# ───────────────────────────────────────────

def logout_view(request):
    logout(request)
    messages.info(request, 'You have been logged out successfully.')
    return redirect('accounts:login')


# ───────────────────────────────────────────
# REGISTER VIEW
# ───────────────────────────────────────────

def register_view(request):
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    form = RegistrationForm()

    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(
                request,
                'Account created successfully! '
                'Please wait for an administrator to approve your account.'
            )
            return redirect('accounts:pending_approval')

    return render(request, 'accounts/register.html', {'form': form})


# ───────────────────────────────────────────
# DASHBOARD VIEW
# ───────────────────────────────────────────

@login_required
def dashboard_view(request):
    user = request.user
    from credentials.models import Credential, VerificationLog, CredentialStatus

    if user.is_superuser or user.role == Role.ADMIN:
        pending_count = CustomUser.objects.filter(
            is_approved=False, is_active=True, is_superuser=False
        ).count()

        verif_labels, verif_data = _verif_by_day(VerificationLog.objects)
        cred_labels, cred_data = _creds_by_month(Credential.objects)

        today_fraud = VerificationLog.objects.filter(
            flagged_as_suspicious=True,
            timestamp__date=timezone.now().date()
        ).count()

        context = {
            'user': user,
            'total_credentials': Credential.objects.count(),
            'active_credentials': Credential.objects.filter(
                status=CredentialStatus.ACTIVE).count(),
            'revoked_credentials': Credential.objects.filter(
                status=CredentialStatus.REVOKED).count(),
            'total_verifications': VerificationLog.objects.count(),
            'recent_credentials': Credential.objects.all()[:5],
            'pending_users_count': pending_count,
            'today_fraud_flags': today_fraud,
            # chart data
            'verif_labels': json.dumps(verif_labels),
            'verif_data': json.dumps(verif_data),
            'cred_labels': json.dumps(cred_labels),
            'cred_data': json.dumps(cred_data),
            'status_data': json.dumps([
                Credential.objects.filter(status='ACTIVE').count(),
                Credential.objects.filter(status='REVOKED').count(),
                Credential.objects.filter(status='EXPIRED').count(),
            ]),
        }
        return render(request, 'admin/dashboard.html', context)

    elif user.role == Role.ISSUER:
        credentials = Credential.objects.filter(issued_by=user)
        cred_labels, cred_data = _creds_by_month(credentials)

        context = {
            'user': user,
            'total_credentials': credentials.count(),
            'active_credentials': credentials.filter(
                status=CredentialStatus.ACTIVE).count(),
            'revoked_credentials': credentials.filter(
                status=CredentialStatus.REVOKED).count(),
            'recent_credentials': credentials[:5],
            # chart data
            'cred_labels': json.dumps(cred_labels),
            'cred_data': json.dumps(cred_data),
            'status_data': json.dumps([
                credentials.filter(status='ACTIVE').count(),
                credentials.filter(status='REVOKED').count(),
                credentials.filter(status='EXPIRED').count(),
            ]),
        }
        return render(request, 'issuer/dashboard.html', context)

    elif user.role == Role.VERIFIER:
        logs = VerificationLog.objects.filter(verified_by=user)
        verif_labels, verif_data = _verif_by_day(logs)

        context = {
            'user': user,
            'total_verifications': logs.count(),
            'successful_verifications': logs.filter(result='SUCCESS').count(),
            'failed_verifications': logs.filter(
                result__in=['FAILED', 'NOT_FOUND', 'REVOKED']).count(),
            'recent_verifications': logs[:5],
            # chart data
            'verif_labels': json.dumps(verif_labels),
            'verif_data': json.dumps(verif_data),
            'result_data': json.dumps([
                logs.filter(result='SUCCESS').count(),
                logs.filter(result='NOT_FOUND').count(),
                logs.filter(result='REVOKED').count(),
                logs.filter(result='FAILED').count(),
            ]),
        }
        return render(request, 'verifier/dashboard.html', context)

    return render(request, 'accounts/dashboard_base.html', {'user': user})
# ───────────────────────────────────────────
# PENDING APPROVAL VIEW
# ───────────────────────────────────────────

def pending_approval_view(request):
    return render(request, 'accounts/pending_approval.html')


# ───────────────────────────────────────────
# PENDING USERS VIEW (admin)
# ───────────────────────────────────────────

@login_required
def pending_users_view(request):
    if not (request.user.is_superuser or request.user.role == Role.ADMIN):
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    pending = CustomUser.objects.filter(
        is_approved=False, is_active=True, is_superuser=False
    ).order_by('date_joined')

    return render(request, 'accounts/pending_users.html', {
        'pending_users': pending,
        'pending_count': pending.count(),
    })


# ───────────────────────────────────────────
# APPROVE USER VIEW (admin)
# ───────────────────────────────────────────

@login_required
def approve_user_view(request, user_id):
    if not (request.user.is_superuser or request.user.role == Role.ADMIN):
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    if request.method != 'POST':
        return redirect('accounts:pending_users')

    user = get_object_or_404(CustomUser, pk=user_id, is_approved=False, is_active=True)
    user.is_approved = True
    user.save(update_fields=['is_approved'])
    log_action(request.user, 'USER_APPROVED', target=user, request=request)

    messages.success(
        request,
        f'{user.username} ({user.get_role_display()}) has been approved and can now log in.'
    )
    return redirect('accounts:pending_users')


# ───────────────────────────────────────────
# REJECT USER VIEW (admin)
# ───────────────────────────────────────────

@login_required
def reject_user_view(request, user_id):
    if not (request.user.is_superuser or request.user.role == Role.ADMIN):
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    if request.method != 'POST':
        return redirect('accounts:pending_users')

    user = get_object_or_404(CustomUser, pk=user_id, is_approved=False, is_active=True)
    reason = request.POST.get('reason', '').strip()

    # Deactivate — preserves the row for audit trail
    user.is_active = False
    user.save(update_fields=['is_active'])
    log_action(request.user, 'USER_REJECTED', target=user, notes=reason, request=request)

    from accounts.notifications import send_account_rejected_email
    send_account_rejected_email(user, reason)

    messages.warning(
        request,
        f'Account for {user.username} has been rejected.'
    )
    return redirect('accounts:pending_users')


# ───────────────────────────────────────────
# PROFILE SETTINGS VIEW
# ───────────────────────────────────────────

@login_required
def profile_view(request):
    user = request.user
    profile_form = ProfileForm(instance=user)
    password_form = PasswordChangeForm()

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_profile':
            profile_form = ProfileForm(request.POST, instance=user)
            if profile_form.is_valid():
                profile_form.save()
                log_action(user, 'PROFILE_UPDATED', target=user, request=request)
                messages.success(request, 'Profile updated successfully.')
                return redirect('accounts:profile')

        elif action == 'change_password':
            password_form = PasswordChangeForm(request.POST)
            if password_form.is_valid():
                if not user.check_password(password_form.cleaned_data['current_password']):
                    password_form.add_error('current_password', 'Incorrect current password.')
                else:
                    user.set_password(password_form.cleaned_data['new_password'])
                    user.save()
                    from django.contrib.auth import update_session_auth_hash
                    update_session_auth_hash(request, user)
                    log_action(user, 'PASSWORD_CHANGED', target=user, request=request)
                    messages.success(request, 'Password changed successfully.')
                    return redirect('accounts:profile')

    return render(request, 'accounts/profile.html', {
        'profile_form': profile_form,
        'password_form': password_form,
    })


# ───────────────────────────────────────────
# AUDIT LOG VIEW (admin only)
# ───────────────────────────────────────────

@login_required
def audit_log_view(request):
    if not (request.user.is_superuser or request.user.role == Role.ADMIN):
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    qs = AuditLog.objects.select_related('actor').all()

    action_filter = request.GET.get('action', '').strip()
    actor_filter  = request.GET.get('actor', '').strip()
    date_from     = request.GET.get('date_from', '').strip()
    date_to       = request.GET.get('date_to', '').strip()

    if action_filter:
        qs = qs.filter(action=action_filter)
    if actor_filter:
        qs = qs.filter(actor__username__icontains=actor_filter)
    if date_from:
        try:
            from datetime import date
            qs = qs.filter(timestamp__date__gte=date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            from datetime import date
            qs = qs.filter(timestamp__date__lte=date.fromisoformat(date_to))
        except ValueError:
            pass

    from django.core.paginator import Paginator
    paginator = Paginator(qs, 40)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, 'admin/audit_log.html', {
        'page_obj': page_obj,
        'action_choices': AuditLog.ACTION_CHOICES,
        'action_filter': action_filter,
        'actor_filter': actor_filter,
        'date_from': date_from,
        'date_to': date_to,
        'total': qs.count(),
    })