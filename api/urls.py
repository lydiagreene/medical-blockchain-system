"""
api/urls.py
All REST API routes, mounted at /api/v1/ in verifydoc/urls.py
"""

from django.urls import path
from . import views
from . import auth_views
from . import admin_views
from . import credential_views
from . import biometric_views
from . import institution_views
from . import two_factor_views

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/login/',    auth_views.api_login,          name='api_login'),
    path('auth/register/', auth_views.api_register,       name='api_register'),
    path('auth/me/',       auth_views.api_me,             name='api_me'),
    path('auth/me/update/',             auth_views.api_update_profile,         name='api_update_profile'),
    path('auth/logout/',                auth_views.api_logout,                 name='api_logout'),
    path('auth/password-reset/',        auth_views.api_password_reset,         name='api_password_reset'),
    path('auth/password-reset-confirm/', auth_views.api_password_reset_confirm, name='api_password_reset_confirm'),
    path('auth/send-verification/',     auth_views.api_send_verification_email, name='api_send_verification'),
    path('auth/verify-email/',          auth_views.api_verify_email,            name='api_verify_email'),

    # ── Two-Factor Authentication ─────────────────────────────────────────────
    path('auth/2fa/setup/',   two_factor_views.api_2fa_setup,   name='api_2fa_setup'),
    path('auth/2fa/confirm/', two_factor_views.api_2fa_confirm, name='api_2fa_confirm'),
    path('auth/2fa/verify/',  two_factor_views.api_2fa_verify,  name='api_2fa_verify'),

    # ── Stats (role-based) ────────────────────────────────────────────────────
    path('stats/', auth_views.api_stats, name='api_stats'),

    # ── Public lookup — no auth required ─────────────────────────────────────
    path('verify/<str:license_number>/', views.public_verify, name='api_public_verify'),

    # ── Authenticated credential endpoints ───────────────────────────────────
    path('credentials/',                                          views.credential_list,                       name='api_credential_list'),
    path('credentials/<str:credential_id>/revoke/',               views.revoke_credential,                     name='api_credential_revoke'),
    path('credentials/<str:credential_id>/renew/',                credential_views.renew_credential_api,       name='api_credential_renew'),
    path('credentials/<str:credential_id>/certificate/',          credential_views.certificate_api,            name='api_credential_certificate'),
    path('credentials/<str:credential_id>/blockchain-status/',    credential_views.blockchain_status_api,      name='api_credential_blockchain_status'),
    path('credentials/<str:credential_id>/',                      views.credential_detail,                     name='api_credential_detail'),

    # ── Biometrics ────────────────────────────────────────────────────────────
    path('biometrics/verify-face/', biometric_views.verify_face_api, name='api_verify_face'),

    # ── Admin: user management, audit log, fraud ─────────────────────────────
    path('admin/users/',                              admin_views.pending_users,   name='api_pending_users'),
    path('admin/users/all/',                          admin_views.all_users,       name='api_all_users'),
    path('admin/users/<int:user_id>/approve/',        admin_views.approve_user,    name='api_approve_user'),
    path('admin/users/<int:user_id>/reject/',         admin_views.reject_user,     name='api_reject_user'),
    path('admin/users/<int:user_id>/reset-2fa/',      admin_views.reset_user_totp, name='api_reset_user_totp'),
    path('admin/users/<int:user_id>/unlock/',         admin_views.unlock_user,     name='api_unlock_user'),
    path('admin/audit-log/',                          admin_views.audit_log,       name='api_audit_log'),
    path('admin/fraud/',                              admin_views.fraud_dashboard, name='api_fraud_dashboard'),

    # ── Institutions ─────────────────────────────────────────────────────────
    path('institutions/',                          institution_views.institution_list_public,  name='api_institutions_public'),
    path('admin/institutions/',                    institution_views.admin_institution_list,   name='api_admin_institution_list'),
    path('admin/institutions/<int:institution_id>/', institution_views.admin_institution_detail, name='api_admin_institution_detail'),
]
