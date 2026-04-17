"""
credentials/views.py
Placeholder views — full logic added after models are ready
"""

from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required
def issue_credential_view(request):
    return render(request, 'issuer/register_credential.html')


@login_required
def verify_credential_view(request):
    return render(request, 'verifier/verify_credential.html')


@login_required
def revoke_credential_view(request, credential_id):
    return render(request, 'admin/revoke_credential.html')


@login_required
def all_credentials_view(request):
    return render(request, 'admin/all_credentials.html')