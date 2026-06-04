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


# ───────────────────────────────────────────
# PROFILE SETTINGS FORM
# ───────────────────────────────────────────

class ProfileForm(forms.ModelForm):
    """Lets a logged-in user update their own profile details."""

    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'institution_name', 'phone_number']
        widgets = {
            'first_name':       forms.TextInput(attrs={'class': 'form-control'}),
            'last_name':        forms.TextInput(attrs={'class': 'form-control'}),
            'email':            forms.EmailInput(attrs={'class': 'form-control'}),
            'institution_name': forms.TextInput(attrs={'class': 'form-control'}),
            'phone_number':     forms.TextInput(attrs={'class': 'form-control'}),
        }

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        qs = CustomUser.objects.filter(email=email).exclude(pk=self.instance.pk)
        if qs.exists():
            raise forms.ValidationError('That email address is already in use.')
        return email


class PasswordChangeForm(forms.Form):
    """In-profile password change — requires current password for safety."""

    current_password = forms.CharField(
        label='Current password',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'autocomplete': 'current-password'}),
    )
    new_password = forms.CharField(
        label='New password',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'autocomplete': 'new-password'}),
        min_length=8,
    )
    confirm_password = forms.CharField(
        label='Confirm new password',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'autocomplete': 'new-password'}),
    )

    def clean_confirm_password(self):
        p1 = self.cleaned_data.get('new_password', '')
        p2 = self.cleaned_data.get('confirm_password', '')
        if p1 and p1 != p2:
            raise forms.ValidationError('Passwords do not match.')
        return p2