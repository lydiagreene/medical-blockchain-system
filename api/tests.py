"""
api/tests.py
Tests for all four REST API endpoints:
  POST /api/v1/auth/token/
  GET  /api/v1/verify/<license_number>/
  GET  /api/v1/credentials/
  GET  /api/v1/credentials/<uuid>/
"""

from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from accounts.models import CustomUser, Role
from credentials.models import Credential


# ── Shared helpers ────────────────────────────────────────────────────────────

def make_user(username, role, is_superuser=False):
    return CustomUser.objects.create_user(
        username=username,
        password='testpass123',
        role=role,
        is_superuser=is_superuser,
        is_approved=True,
        email=f'{username}@test.com',
    )


def make_credential(issuer, license_number='UG-API-001', status='ACTIVE'):
    return Credential.objects.create(
        practitioner_name='Dr. API Test',
        practitioner_id=f'NIN-{license_number}',
        qualification='MBChB',
        specialization='Surgery',
        institution_of_study='Makerere University',
        year_of_graduation=2016,
        license_number=license_number,
        license_expiry_date=date.today() + timedelta(days=365),
        status=status,
        issued_by=issuer,
        ipfs_photo_hash='QmPHOTO123',
        ipfs_document_hash='QmDOC456',
        blockchain_tx_hash='0xdeadbeef',
    )


def get_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


# ── Token Auth ────────────────────────────────────────────────────────────────

class TokenAuthTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user('token_user', Role.ISSUER)

    def test_valid_credentials_return_token(self):
        resp = self.client.post('/api/v1/auth/token/', {
            'username': 'token_user',
            'password': 'testpass123',
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.data)

    def test_invalid_credentials_return_400(self):
        resp = self.client.post('/api/v1/auth/token/', {
            'username': 'token_user',
            'password': 'wrongpassword',
        })
        self.assertEqual(resp.status_code, 400)

    def test_missing_fields_return_400(self):
        resp = self.client.post('/api/v1/auth/token/', {})
        self.assertEqual(resp.status_code, 400)


# ── Public Verify ─────────────────────────────────────────────────────────────

class PublicVerifyTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.issuer = make_user('pub_issuer', Role.ISSUER)
        self.cred = make_credential(self.issuer, 'UG-PUB-001')

    @patch('blockchain.utils.verify_credential_on_chain',
           return_value={'success': True, 'is_active': True})
    def test_existing_credential_returns_200(self, _mock):
        resp = self.client.get('/api/v1/verify/UG-PUB-001/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['license_number'], 'UG-PUB-001')

    def test_nonexistent_credential_returns_404(self):
        resp = self.client.get('/api/v1/verify/NONEXISTENT/')
        self.assertEqual(resp.status_code, 404)

    @patch('blockchain.utils.verify_credential_on_chain',
           return_value={'success': True, 'is_active': True})
    def test_no_auth_token_required(self, _mock):
        # No token set on client — should still return 200
        resp = self.client.get('/api/v1/verify/UG-PUB-001/')
        self.assertEqual(resp.status_code, 200)

    @patch('blockchain.utils.verify_credential_on_chain',
           return_value={'success': True, 'is_active': True})
    def test_response_includes_photo_url(self, _mock):
        resp = self.client.get('/api/v1/verify/UG-PUB-001/')
        self.assertIn('photo_url', resp.data)
        self.assertIn('QmPHOTO123', resp.data['photo_url'])

    @patch('blockchain.utils.verify_credential_on_chain',
           return_value={'success': True, 'is_active': True})
    def test_response_excludes_ipfs_hashes(self, _mock):
        # Public endpoint must not expose raw IPFS hashes
        resp = self.client.get('/api/v1/verify/UG-PUB-001/')
        self.assertNotIn('ipfs_document_hash', resp.data)
        self.assertNotIn('ipfs_photo_hash', resp.data)

    @patch('blockchain.utils.verify_credential_on_chain',
           return_value={'success': True, 'is_active': True})
    def test_response_includes_blockchain_active_flag(self, _mock):
        resp = self.client.get('/api/v1/verify/UG-PUB-001/')
        self.assertIn('blockchain_active', resp.data)
        self.assertTrue(resp.data['blockchain_active'])

    @patch('blockchain.utils.verify_credential_on_chain',
           return_value={'success': True, 'is_active': True})
    def test_license_number_lookup_is_case_insensitive(self, _mock):
        resp = self.client.get('/api/v1/verify/ug-pub-001/')
        # Model stores as uppercase; view does .upper() lookup
        self.assertEqual(resp.status_code, 200)


# ── Credential List ───────────────────────────────────────────────────────────

class CredentialListAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user('api_admin', Role.ADMIN)
        self.issuer_a = make_user('api_issuer_a', Role.ISSUER)
        self.issuer_b = make_user('api_issuer_b', Role.ISSUER)
        self.verifier = make_user('api_verifier', Role.VERIFIER)

        self.cred_a = make_credential(self.issuer_a, 'UG-LIST-001')
        self.cred_b = make_credential(self.issuer_b, 'UG-LIST-002',
                                      status='REVOKED')

    def _auth(self, user):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Token {get_token(user)}'
        )

    def test_unauthenticated_returns_401(self):
        resp = self.client.get('/api/v1/credentials/')
        self.assertEqual(resp.status_code, 401)

    def test_admin_sees_all_credentials(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/credentials/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 2)

    def test_issuer_sees_only_own_credentials(self):
        self._auth(self.issuer_a)
        resp = self.client.get('/api/v1/credentials/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(
            resp.data['results'][0]['license_number'], 'UG-LIST-001'
        )

    def test_verifier_gets_403(self):
        self._auth(self.verifier)
        resp = self.client.get('/api/v1/credentials/')
        self.assertEqual(resp.status_code, 403)

    def test_search_by_name_filters_results(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/credentials/', {'q': 'UG-LIST-001'})
        self.assertEqual(resp.data['count'], 1)

    def test_status_filter(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/credentials/', {'status': 'REVOKED'})
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(
            resp.data['results'][0]['status'], 'REVOKED'
        )

    def test_response_contains_pagination_fields(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/credentials/')
        self.assertIn('count', resp.data)
        self.assertIn('results', resp.data)
        self.assertIn('next', resp.data)

    def test_result_contains_expected_fields(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/credentials/')
        row = resp.data['results'][0]
        for field in ('credential_id', 'practitioner_name', 'license_number',
                      'status', 'issued_by', 'created_at'):
            self.assertIn(field, row)


# ── Credential Detail ─────────────────────────────────────────────────────────

class CredentialDetailAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user('det_admin', Role.ADMIN)
        self.issuer_a = make_user('det_issuer_a', Role.ISSUER)
        self.issuer_b = make_user('det_issuer_b', Role.ISSUER)
        self.cred = make_credential(self.issuer_a, 'UG-DET-001')

    def _auth(self, user):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Token {get_token(user)}'
        )

    def _url(self, cred=None):
        return f'/api/v1/credentials/{(cred or self.cred).credential_id}/'

    def test_admin_can_access_any_credential(self):
        self._auth(self.admin)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['license_number'], 'UG-DET-001')

    def test_issuer_can_access_own_credential(self):
        self._auth(self.issuer_a)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)

    def test_issuer_cannot_access_others_credential(self):
        self._auth(self.issuer_b)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 403)

    def test_nonexistent_credential_returns_404(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/credentials/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(resp.status_code, 404)

    def test_unauthenticated_returns_401(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 401)

    def test_response_includes_ipfs_hashes(self):
        self._auth(self.admin)
        resp = self.client.get(self._url())
        self.assertIn('ipfs_document_hash', resp.data)
        self.assertIn('ipfs_photo_hash', resp.data)
        self.assertEqual(resp.data['ipfs_photo_hash'], 'QmPHOTO123')

    def test_response_includes_document_and_photo_urls(self):
        self._auth(self.admin)
        resp = self.client.get(self._url())
        self.assertIn('document_url', resp.data)
        self.assertIn('photo_url', resp.data)
        self.assertIn('QmDOC456', resp.data['document_url'])

    def test_response_includes_etherscan_url(self):
        self._auth(self.admin)
        resp = self.client.get(self._url())
        self.assertIn('etherscan_url', resp.data)
        self.assertIn('0xdeadbeef', resp.data['etherscan_url'])
