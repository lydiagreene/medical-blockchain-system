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
    """
    Routes each user to their role-specific dashboard
    """
    user = request.user

    if user.is_superuser or user.role == Role.ADMIN:
        return render(request, 'admin/dashboard.html', {'user': user})

    elif user.role == Role.ISSUER:
        return render(request, 'issuer/dashboard.html', {'user': user})

    elif user.role == Role.VERIFIER:
        return render(request, 'verifier/dashboard.html', {'user': user})

    # Fallback
    return render(request, 'accounts/dashboard_base.html', {'user': user})


# ───────────────────────────────────────────
# PENDING APPROVAL VIEW
# ───────────────────────────────────────────

def pending_approval_view(request):
    return render(request, 'accounts/pending_approval.html')