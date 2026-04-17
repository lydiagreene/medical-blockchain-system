"""
biometrics/views.py
Placeholder view — full facial recognition logic added later
"""

from django.http import JsonResponse


def verify_face_view(request):
    return JsonResponse({'status': 'biometrics endpoint ready'})