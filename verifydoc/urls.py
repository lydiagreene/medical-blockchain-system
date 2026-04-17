"""
verifydoc/urls.py
Master URL routing file — all app URLs connect here
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django admin panel
    path('admin/', admin.site.urls),

    # Accounts app — login, logout, register, dashboard
    path('accounts/', include('accounts.urls')),

    # Credentials app — issue, verify, revoke
    path('credentials/', include('credentials.urls')),

    # Biometrics app — face verification endpoint
    path('biometrics/', include('biometrics.urls')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)