"""
credentials/urls.py
URL routes for the credentials app
"""

from django.urls import path
from . import views

app_name = 'credentials'

urlpatterns = [
    path('issue/', views.issue_credential_view, name='issue'),
    path('verify/', views.verify_credential_view, name='verify'),
    path('revoke/<str:credential_id>/', views.revoke_credential_view, name='revoke'),
    path('all/', views.all_credentials_view, name='all'),
    path('<str:credential_id>/certificate/', views.certificate_view, name='certificate'),
    path('<str:credential_id>/renew/', views.renew_credential_view, name='renew'),
    path('<str:credential_id>/blockchain-status/', views.blockchain_status_view, name='blockchain_status'),
    path('<str:credential_id>/', views.credential_detail_view, name='detail'),
]