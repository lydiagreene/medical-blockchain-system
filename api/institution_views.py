"""
api/institution_views.py
CRUD endpoints for the Institution model.
  Admin:  full CRUD at /api/v1/admin/institutions/
  All auth users: GET /api/v1/institutions/ (active list for dropdowns)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers, status
from django.shortcuts import get_object_or_404

from accounts.models import Institution, Role


# ── Serializer ────────────────────────────────────────────────────────────────

class InstitutionSerializer(drf_serializers.ModelSerializer):
    registered_by = drf_serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Institution
        fields = [
            'id', 'name', 'institution_type', 'address',
            'contact_email', 'contact_phone', 'is_active',
            'wallet_address', 'registered_by', 'created_at',
        ]
        read_only_fields = ['id', 'registered_by', 'created_at']


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_admin(user):
    return user.is_superuser or user.role == Role.ADMIN


# ── Public (authenticated) — active institutions list for dropdowns ────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def institution_list_public(request):
    """GET /api/v1/institutions/ — all active institutions (for form dropdowns, no auth needed)."""
    qs = Institution.objects.filter(is_active=True).order_by('name')
    data = [{'id': i.id, 'name': i.name, 'institution_type': i.institution_type} for i in qs]
    return Response(data)


# ── Admin CRUD ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_institution_list(request):
    """
    GET  /api/v1/admin/institutions/ — paginated list (admin only)
    POST /api/v1/admin/institutions/ — create institution (admin only)
    """
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'POST':
        serializer = InstitutionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(registered_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # GET
    q = request.query_params.get('q', '').strip()
    qs = Institution.objects.all().order_by('name')
    if q:
        qs = qs.filter(name__icontains=q)

    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(qs, request)
    serializer = InstitutionSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_institution_detail(request, institution_id):
    """
    GET    /api/v1/admin/institutions/<id>/ — detail
    PATCH  /api/v1/admin/institutions/<id>/ — partial update
    DELETE /api/v1/admin/institutions/<id>/ — deactivate (soft delete)
    """
    if not _is_admin(request.user):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

    institution = get_object_or_404(Institution, id=institution_id)

    if request.method == 'GET':
        return Response(InstitutionSerializer(institution).data)

    if request.method == 'PATCH':
        serializer = InstitutionSerializer(institution, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    # DELETE — soft delete (deactivate)
    institution.is_active = False
    institution.save(update_fields=['is_active'])
    return Response({'detail': f'{institution.name} deactivated.'})
