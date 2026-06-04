from django.urls import path
from . import views

app_name = 'fraud'

urlpatterns = [
    path('', views.fraud_dashboard_view, name='dashboard'),
]
