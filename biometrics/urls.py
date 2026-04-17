"""
biometrics/urls.py
URL routes for the biometrics app
"""

from django.urls import path
from . import views

app_name = 'biometrics'

urlpatterns = [
    path('verify-face/', views.verify_face_view, name='verify_face'),
]