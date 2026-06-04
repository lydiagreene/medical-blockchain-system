"""
accounts/tests.py
Tests for admin approval notification signals and password reset URLs.
"""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from accounts.models import CustomUser, Role


def make_admin(username='admin1'):
    return CustomUser.objects.create_user(
        username=username,
        password='pass',
        role=Role.ADMIN,
        is_approved=True,
        email=f'{username}@test.com',
    )


# ── Registration Notification Signal ─────────────────────────────────────────

class AdminNotificationSignalTest(TestCase):

    def setUp(self):
        # Create an approved admin with an email so they get notified
        self.admin = make_admin()

    @patch('accounts.signals.send_mail')
    def test_admin_notified_when_new_user_registers(self, mock_mail):
        CustomUser.objects.create_user(
            username='new_issuer',
            password='pass',
            role=Role.ISSUER,
            email='newissuer@test.com',
            is_approved=False,
        )
        mock_mail.assert_called_once()
        subject = mock_mail.call_args[1]['subject']
        self.assertIn('new_issuer', subject)

    @patch('accounts.signals.send_mail')
    def test_superuser_creation_does_not_trigger_notification(self, mock_mail):
        CustomUser.objects.create_superuser(
            username='newsuperuser',
            password='pass',
            email='su@test.com',
        )
        mock_mail.assert_not_called()

    @patch('accounts.signals.send_mail')
    def test_notification_email_sent_to_all_admins(self, mock_mail):
        make_admin('admin2')
        CustomUser.objects.create_user(
            username='another_issuer',
            password='pass',
            role=Role.ISSUER,
            email='ai2@test.com',
        )
        recipients = mock_mail.call_args[1]['recipient_list']
        self.assertEqual(len(recipients), 2)


# ── Approval Notification Signal ──────────────────────────────────────────────

class ApprovalNotificationSignalTest(TestCase):

    @patch('accounts.signals.send_mail')
    def test_user_notified_when_account_approved(self, mock_mail):
        user = CustomUser.objects.create_user(
            username='pending_user',
            password='pass',
            role=Role.ISSUER,
            email='pending@test.com',
            is_approved=False,
        )
        mock_mail.reset_mock()

        user.is_approved = True
        user.save(update_fields=['is_approved'])

        mock_mail.assert_called_once()
        recipients = mock_mail.call_args[1]['recipient_list']
        self.assertIn('pending@test.com', recipients)

    @patch('accounts.signals.send_mail')
    def test_no_email_sent_when_other_field_updated(self, mock_mail):
        user = CustomUser.objects.create_user(
            username='stable_user',
            password='pass',
            role=Role.ISSUER,
            email='stable@test.com',
            is_approved=True,
        )
        mock_mail.reset_mock()

        user.institution_name = 'Updated Hospital'
        user.save(update_fields=['institution_name'])

        mock_mail.assert_not_called()


# ── Password Reset URL Resolution ─────────────────────────────────────────────

class PasswordResetURLTest(TestCase):

    def test_password_reset_form_url_resolves(self):
        url = reverse('accounts:password_reset')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

    def test_password_reset_done_url_resolves(self):
        url = reverse('accounts:password_reset_done')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

    def test_password_reset_complete_url_resolves(self):
        url = reverse('accounts:password_reset_complete')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
