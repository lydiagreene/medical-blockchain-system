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
]