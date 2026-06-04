"""
verifydoc/urls.py
Master URL routing file — all app URLs connect here
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from credentials.views import public_search_view, public_result_view
from . import views as root_views

urlpatterns = [
    # Landing / onboarding page
    path('', root_views.landing_view, name='landing'),

    # Django admin panel
    path('admin/', admin.site.urls),

    # Public employer verification portal — no login required
    path('verify/', public_search_view, name='public_search'),
    path('verify/<str:license_number>/', public_result_view, name='public_result'),

    # Accounts app — login, logout, register, dashboard
    path('accounts/', include('accounts.urls')),

    # Credentials app — issue, verify, revoke
    path('credentials/', include('credentials.urls')),

    # Biometrics app — face verification endpoint
    path('biometrics/', include('biometrics.urls')),

    # Fraud detection dashboard
    path('fraud/', include('fraud_detection.urls')),

    # REST API v1
    path('api/v1/', include('api.urls')),

    # OpenAPI schema & interactive docs
    path('api/schema/',  SpectacularAPIView.as_view(),         name='schema'),
    path('api/docs/',    SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/',   SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),

    # React SPA catch-all — must be last so Django routes take priority
    re_path(r'^app/.*$', root_views.spa_view, name='spa'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'verifydoc.views.handler404'
handler500 = 'verifydoc.views.handler500'