"""
credentials/tests.py
Tests for credential models, views, search/filter, detail, revoke,
and the check_license_expiry management command.
"""

from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.urls import reverse
from django.core import mail
from django.core.management import call_command
from io import StringIO

from accounts.models import CustomUser, Role
from credentials.models import Credential, CredentialStatus, VerificationLog


# ── Shared helpers ────────────────────────────────────────────────────────────

def make_user(username, role, is_superuser=False, approved=True):
    user = CustomUser.objects.create_user(
        username=username,
        password='testpass123',
        role=role,
        is_superuser=is_superuser,
        is_approved=approved,
        email=f'{username}@test.com',
    )
    return user


def make_credential(issued_by, license_number='UG-MD-001', status='ACTIVE',
                    expiry=None):
    return Credential.objects.create(
        practitioner_name='Dr. Test User',
        practitioner_id=f'NIN-{license_number}',
        qualification='MBChB',
        specialization='General Medicine',
        institution_of_study='Makerere University',
        year_of_graduation=2015,
        license_number=license_number,
        license_expiry_date=expiry or date.today() + timedelta(days=365),
        status=status,
        issued_by=issued_by,
    )


# ── Model Tests ───────────────────────────────────────────────────────────────

class CredentialModelTest(TestCase):

    def setUp(self):
        self.issuer = make_user('issuer1', Role.ISSUER)

    def test_is_active_property(self):
        cred = make_credential(self.issuer)
        self.assertTrue(cred.is_active)

    def test_is_revoked_property(self):
        cred = make_credential(self.issuer, status='REVOKED')
        self.assertTrue(cred.is_revoked)
        self.assertFalse(cred.is_active)

    def test_has_document_false_by_default(self):
        cred = make_credential(self.issuer)
        self.assertFalse(cred.has_document)

    def test_has_document_true_when_hash_set(self):
        cred = make_credential(self.issuer)
        cred.ipfs_document_hash = 'QmABC123'
        cred.save()
        self.assertTrue(cred.has_document)

    def test_has_photo_false_by_default(self):
        cred = make_credential(self.issuer)
        self.assertFalse(cred.has_photo)

    def test_is_on_blockchain_false_by_default(self):
        cred = make_credential(self.issuer)
        self.assertFalse(cred.is_on_blockchain)

    def test_is_on_blockchain_true_when_tx_set(self):
        cred = make_credential(self.issuer)
        cred.blockchain_tx_hash = '0xdeadbeef'
        cred.save()
        self.assertTrue(cred.is_on_blockchain)

    def test_str_representation(self):
        cred = make_credential(self.issuer)
        self.assertIn('Dr. Test User', str(cred))
        self.assertIn('MBChB', str(cred))


# ── All Credentials View ──────────────────────────────────────────────────────

class AllCredentialsViewTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.admin = make_user('admin1', Role.ADMIN)
        self.issuer_a = make_user('issuer_a', Role.ISSUER)
        self.issuer_b = make_user('issuer_b', Role.ISSUER)
        self.verifier = make_user('verifier1', Role.VERIFIER)

        self.cred_a = make_credential(self.issuer_a, 'UG-MD-001')
        self.cred_b = make_credential(self.issuer_b, 'UG-MD-002',
                                      status='REVOKED')
        self.url = reverse('credentials:all')

    def test_admin_sees_all_credentials(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.context['credentials'].count(), 2)

    def test_issuer_sees_only_own(self):
        self.client.force_login(self.issuer_a)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        creds = resp.context['credentials']
        self.assertEqual(creds.count(), 1)
        self.assertEqual(creds.first().license_number, 'UG-MD-001')

    def test_verifier_redirected(self):
        self.client.force_login(self.verifier)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 302)

    def test_unauthenticated_redirected(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 302)

    def test_search_by_name(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'q': 'Dr. Test'})
        self.assertEqual(resp.context['credentials'].count(), 2)

    def test_search_by_license(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'q': 'UG-MD-001'})
        self.assertEqual(resp.context['credentials'].count(), 1)

    def test_filter_by_status_active(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'status': 'ACTIVE'})
        self.assertEqual(resp.context['credentials'].count(), 1)

    def test_filter_by_status_revoked(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'status': 'REVOKED'})
        self.assertEqual(resp.context['credentials'].count(), 1)

    def test_filter_by_qualification(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'qualification': 'MBChB'})
        self.assertEqual(resp.context['credentials'].count(), 2)

    def test_search_no_results(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'q': 'NONEXISTENT'})
        self.assertEqual(resp.context['credentials'].count(), 0)

    def test_context_passes_search_query_back(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self.url, {'q': 'hello'})
        self.assertEqual(resp.context['search_query'], 'hello')


# ── Credential Detail View ────────────────────────────────────────────────────

class CredentialDetailViewTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.admin = make_user('admin1', Role.ADMIN)
        self.issuer_a = make_user('issuer_a', Role.ISSUER)
        self.issuer_b = make_user('issuer_b', Role.ISSUER)
        self.verifier = make_user('verifier1', Role.VERIFIER)
        self.cred = make_credential(self.issuer_a, 'UG-MD-001')

    def _url(self, cred=None):
        return reverse('credentials:detail',
                       args=[str((cred or self.cred).credential_id)])

    def test_admin_can_view_any_credential(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.context['credential'], self.cred)

    def test_issuer_can_view_own_credential(self):
        self.client.force_login(self.issuer_a)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)

    def test_issuer_cannot_view_others_credential(self):
        self.client.force_login(self.issuer_b)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 302)

    def test_verifier_redirected(self):
        self.client.force_login(self.verifier)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 302)

    def test_photo_url_built_from_ipfs_hash(self):
        self.cred.ipfs_photo_hash = 'QmPHOTO123'
        self.cred.save()
        self.client.force_login(self.admin)
        resp = self.client.get(self._url())
        self.assertIn('QmPHOTO123', resp.context['photo_url'])

    def test_document_url_built_from_ipfs_hash(self):
        self.cred.ipfs_document_hash = 'QmDOC456'
        self.cred.save()
        self.client.force_login(self.admin)
        resp = self.client.get(self._url())
        self.assertIn('QmDOC456', resp.context['document_url'])

    def test_etherscan_url_built_from_tx_hash(self):
        self.cred.blockchain_tx_hash = '0xdeadbeef'
        self.cred.save()
        self.client.force_login(self.admin)
        resp = self.client.get(self._url())
        self.assertIn('0xdeadbeef', resp.context['etherscan_url'])
        self.assertIn('sepolia.etherscan.io', resp.context['etherscan_url'])

    def test_can_revoke_is_true_for_admin_on_active(self):
        self.client.force_login(self.admin)
        resp = self.client.get(self._url())
        self.assertTrue(resp.context['can_revoke'])

    def test_can_revoke_is_false_for_revoked_credential(self):
        self.cred.status = 'REVOKED'
        self.cred.save()
        self.client.force_login(self.admin)
        resp = self.client.get(self._url())
        self.assertFalse(resp.context['can_revoke'])

    def test_can_revoke_is_false_for_issuer(self):
        self.client.force_login(self.issuer_a)
        resp = self.client.get(self._url())
        self.assertFalse(resp.context['can_revoke'])


# ── Revoke Credential View ────────────────────────────────────────────────────

class RevokeCredentialViewTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.admin = make_user('admin1', Role.ADMIN)
        self.issuer = make_user('issuer1', Role.ISSUER)
        self.cred = make_credential(self.issuer, 'UG-MD-001')

    def _url(self):
        return reverse('credentials:revoke',
                       args=[str(self.cred.credential_id)])

    @patch('blockchain.utils.revoke_credential_on_chain',
           return_value={'success': True, 'tx_hash': '0xabc'})
    def test_admin_can_revoke_credential(self, _mock):
        self.client.force_login(self.admin)
        resp = self.client.post(self._url())
        self.assertEqual(resp.status_code, 302)
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.status, CredentialStatus.REVOKED)

    def test_issuer_cannot_revoke(self):
        self.client.force_login(self.issuer)
        resp = self.client.post(self._url())
        self.assertEqual(resp.status_code, 302)
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.status, CredentialStatus.ACTIVE)

    @patch('blockchain.utils.revoke_credential_on_chain',
           return_value={'success': False, 'error': 'Network error'})
    def test_revoke_succeeds_in_db_even_if_blockchain_fails(self, _mock):
        self.client.force_login(self.admin)
        self.client.post(self._url())
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.status, CredentialStatus.REVOKED)


# ── check_license_expiry Management Command ───────────────────────────────────

class CheckLicenseExpiryCommandTest(TestCase):

    def setUp(self):
        self.issuer = make_user('issuer1', Role.ISSUER)

    def test_marks_overdue_credentials_as_expired(self):
        cred = make_credential(
            self.issuer, 'UG-MD-EXP',
            expiry=date.today() - timedelta(days=1),
        )
        call_command('check_license_expiry', stdout=StringIO())
        cred.refresh_from_db()
        self.assertEqual(cred.status, CredentialStatus.EXPIRED)

    def test_dry_run_does_not_save_changes(self):
        cred = make_credential(
            self.issuer, 'UG-MD-DRY',
            expiry=date.today() - timedelta(days=1),
        )
        call_command('check_license_expiry', '--dry-run', stdout=StringIO())
        cred.refresh_from_db()
        self.assertEqual(cred.status, CredentialStatus.ACTIVE)

    def test_active_credentials_not_expired_prematurely(self):
        cred = make_credential(
            self.issuer, 'UG-MD-GOOD',
            expiry=date.today() + timedelta(days=60),
        )
        call_command('check_license_expiry', stdout=StringIO())
        cred.refresh_from_db()
        self.assertEqual(cred.status, CredentialStatus.ACTIVE)

    @patch('credentials.management.commands.check_license_expiry.send_mail')
    def test_sends_alert_email_for_credential_expiring_in_7_days(self, mock_mail):
        self.issuer.email = 'issuer@test.com'
        self.issuer.save()
        make_credential(
            self.issuer, 'UG-MD-SOON',
            expiry=date.today() + timedelta(days=7),
        )
        call_command('check_license_expiry', stdout=StringIO())
        mock_mail.assert_called_once()
        subject = mock_mail.call_args[1]['subject']
        self.assertIn('7', subject)

    @patch('credentials.management.commands.check_license_expiry.send_mail')
    def test_dry_run_does_not_send_emails(self, mock_mail):
        make_credential(
            self.issuer, 'UG-MD-SOON2',
            expiry=date.today() + timedelta(days=1),
        )
        call_command('check_license_expiry', '--dry-run', stdout=StringIO())
        mock_mail.assert_not_called()
