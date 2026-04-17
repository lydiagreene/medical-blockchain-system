"""
accounts/forms.py
Login and registration forms for VerifyDoc Uganda
"""

from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser, Role


# ───────────────────────────────────────────
# LOGIN FORM
# ───────────────────────────────────────────

class LoginForm(forms.Form):
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your username',
            'autofocus': True,
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your password',
        })
    )


# ───────────────────────────────────────────
# REGISTRATION FORM
# ───────────────────────────────────────────

class RegistrationForm(UserCreationForm):
    """
    Extended registration form that includes
    role and institution name
    """

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your email address',
        })
    )

    institution_name = forms.CharField(
        max_length=255,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Name of your medical institution',
        })
    )

    phone_number = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Phone number (optional)',
        })
    )

    role = forms.ChoiceField(
        choices=[
            ('', '-- Select your role --'),
            (Role.ISSUER, 'Issuer (Medical School / Licensing Body)'),
            (Role.VERIFIER, 'Verifier (Hospital / Clinic)'),
        ],
        widget=forms.Select(attrs={
            'class': 'form-control',
        })
    )

    class Meta:
        model = CustomUser
        fields = [
            'username',
            'email',
            'institution_name',
            'phone_number',
            'role',
            'password1',
            'password2',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add Bootstrap styling to password fields
        self.fields['username'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Choose a username',
        })
        self.fields['password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Create a password',
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm your password',
        })

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.institution_name = self.cleaned_data['institution_name']
        user.phone_number = self.cleaned_data['phone_number']
        user.role = self.cleaned_data['role']
        # New users must wait for admin approval
        user.is_approved = False
        user.is_active = True
        if commit:
            user.save()
        return user