"""
credentials/forms.py
Form for registering a new medical credential
"""

from django import forms
from .models import Credential
from django.utils import timezone


class CredentialRegistrationForm(forms.ModelForm):
    """
    Form used by issuers to register a new
    medical practitioner credential
    """

    # Document upload field
    # This is handled separately from the model
    # because it goes to IPFS not the database
    credential_document = forms.FileField(
        required=True,
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': '.pdf,.jpg,.jpeg,.png',
        }),
        help_text="Upload the credential document (PDF or image)"
    )

    # Practitioner photo for biometric verification
    practitioner_photo = forms.ImageField(
        required=True,
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': '.jpg,.jpeg,.png',
        }),
        help_text="Upload a clear photo of the practitioner's face"
    )

    class Meta:
        model = Credential
        fields = [
            'practitioner_name',
            'practitioner_id',
            'date_of_birth',
            'qualification',
            'specialization',
            'institution_of_study',
            'year_of_graduation',
            'license_number',
            'license_expiry_date',
        ]

        widgets = {
            'practitioner_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Full legal name of practitioner',
            }),
            'practitioner_id': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'National ID or passport number',
            }),
            'date_of_birth': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
            }),
            'qualification': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g. MBChB, BDS, MMed',
            }),
            'specialization': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g. Surgery, Paediatrics (optional)',
            }),
            'institution_of_study': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g. Makerere University',
            }),
            'year_of_graduation': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g. 2018',
                'min': 1950,
                'max': timezone.now().year,
            }),
            'license_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'UMDPC license number',
            }),
            'license_expiry_date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
            }),
        }

    def clean_year_of_graduation(self):
        year = self.cleaned_data.get('year_of_graduation')
        current_year = timezone.now().year
        if year and (year < 1950 or year > current_year):
            raise forms.ValidationError(
                f"Year must be between 1950 and {current_year}"
            )
        return year

    def clean_license_expiry_date(self):
        expiry = self.cleaned_data.get('license_expiry_date')
        if expiry and expiry < timezone.now().date():
            raise forms.ValidationError(
                "License expiry date cannot be in the past"
            )
        return expiry

    def clean_practitioner_photo(self):
        photo = self.cleaned_data.get('practitioner_photo')
        if photo:
            # Limit photo size to 5MB
            if photo.size > 5 * 1024 * 1024:
                raise forms.ValidationError(
                    "Photo size must be under 5MB"
                )
        return photo

    def clean_credential_document(self):
        document = self.cleaned_data.get('credential_document')
        if document:
            # Limit document size to 10MB
            if document.size > 10 * 1024 * 1024:
                raise forms.ValidationError(
                    "Document size must be under 10MB"
                )
        return document


# ───────────────────────────────────────────
# VERIFICATION FORM
# ───────────────────────────────────────────

class CredentialVerificationForm(forms.Form):
    """
    Form used by verifiers to check a credential
    """

    license_number = forms.CharField(
        max_length=100,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Enter UMDPC license number to verify',
            'autofocus': True,
        })
    )

    # Hidden field — webcam photo is captured by
    # JavaScript and inserted here before form submission
    face_image_data = forms.CharField(
        required=False,
        widget=forms.HiddenInput(),
    )

    def clean_license_number(self):
        license_number = self.cleaned_data.get('license_number')
        if license_number:
            return license_number.strip().upper()
        return license_number