"""
accounts/views.py
Handles login, logout, registration and dashboard routing
"""

from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import LoginForm, RegistrationForm
from .models import Role


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
        context = {
            'user': user,
            'total_credentials': Credential.objects.count(),
            'active_credentials': Credential.objects.filter(
                status=CredentialStatus.ACTIVE).count(),
            'revoked_credentials': Credential.objects.filter(
                status=CredentialStatus.REVOKED).count(),
            'total_verifications': VerificationLog.objects.count(),
            'recent_credentials': Credential.objects.all()[:5],
        }
        return render(request, 'admin/dashboard.html', context)

    elif user.role == Role.ISSUER:
        credentials = Credential.objects.filter(issued_by=user)
        context = {
            'user': user,
            'total_credentials': credentials.count(),
            'active_credentials': credentials.filter(
                status=CredentialStatus.ACTIVE).count(),
            'revoked_credentials': credentials.filter(
                status=CredentialStatus.REVOKED).count(),
            'recent_credentials': credentials[:5],
        }
        return render(request, 'issuer/dashboard.html', context)

    elif user.role == Role.VERIFIER:
        logs = VerificationLog.objects.filter(verified_by=user)
        context = {
            'user': user,
            'total_verifications': logs.count(),
            'successful_verifications': logs.filter(
                result='SUCCESS').count(),
            'failed_verifications': logs.filter(
                result__in=['FAILED', 'NOT_FOUND', 'REVOKED']).count(),
            'recent_verifications': logs[:5],
        }
        return render(request, 'verifier/dashboard.html', context)

    return render(request, 'accounts/dashboard_base.html', {'user': user})
# ───────────────────────────────────────────
# PENDING APPROVAL VIEW
# ───────────────────────────────────────────

def pending_approval_view(request):
    return render(request, 'accounts/pending_approval.html')