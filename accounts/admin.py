"""
accounts/admin.py
Registers our models so they appear in Django's admin panel
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Institution


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Custom admin view for our user model"""

    # Columns shown in the user list
    list_display = [
        'username',
        'email',
        'role',
        'institution_name',
        'is_approved',
        'is_active',
        'created_at',
    ]

    # Filters on the right side
    list_filter = ['role', 'is_approved', 'is_active']

    # Fields you can search by
    search_fields = ['username', 'email', 'institution_name']

    # Add our custom fields to the user edit form
    fieldsets = UserAdmin.fieldsets + (
        ('VerifyDoc Details', {
            'fields': (
                'role',
                'institution_name',
                'phone_number',
                'is_approved',
            )
        }),
    )


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    """Custom admin view for institutions"""

    list_display = [
        'name',
        'institution_type',
        'contact_email',
        'is_active',
        'created_at',
    ]

    list_filter = ['institution_type', 'is_active']

    search_fields = ['name', 'contact_email']