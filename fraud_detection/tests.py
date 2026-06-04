"""
fraud_detection/tests.py
Tests for rule-based fraud detection and the predict_fraud function.
"""

from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from accounts.models import CustomUser, Role
from credentials.models import Credential, VerificationLog
from fraud_detection.model import rule_based_fraud_check
from fraud_detection.predict import predict_fraud


def make_user(username, role):
    return CustomUser.objects.create_user(
        username=username, password='pass', role=role, is_approved=True,
    )


def make_credential(issuer, license_number='UG-FD-001'):
    return Credential.objects.create(
        practitioner_name='Dr. Fraud Test',
        practitioner_id=f'NIN-{license_number}',
        qualification='MBChB',
        institution_of_study='Makerere University',
        year_of_graduation=2015,
        license_number=license_number,
        license_expiry_date=date.today() + timedelta(days=365),
        status='ACTIVE',
        issued_by=issuer,
    )


def make_log(credential, result='SUCCESS', face_match=True, face_score=0.9):
    return VerificationLog.objects.create(
        credential=credential,
        queried_credential_id=credential.license_number,
        result=result,
        face_match=face_match,
        face_match_score=face_score,
        blockchain_verified=True,
        ip_address='127.0.0.1',
    )


# ── Rule-Based Fraud Detection ────────────────────────────────────────────────

class RuleBasedFraudTest(TestCase):

    def setUp(self):
        self.issuer = make_user('fd_issuer', Role.ISSUER)
        self.cred = make_credential(self.issuer)

    def test_normal_verification_has_low_score(self):
        log = make_log(self.cred, result='SUCCESS', face_match=True)
        score = rule_based_fraud_check(log)
        self.assertLess(score, 0.3)

    def test_face_mismatch_raises_score(self):
        log_match = make_log(self.cred, face_match=True)
        log_no_match = make_log(self.cred, face_match=False)
        score_good = rule_based_fraud_check(log_match)
        score_bad = rule_based_fraud_check(log_no_match)
        self.assertGreater(score_bad, score_good)

    def test_not_found_raises_score(self):
        log = make_log(self.cred, result='NOT_FOUND')
        score = rule_based_fraud_check(log)
        self.assertGreaterEqual(score, 0.2)

    def test_score_capped_at_one(self):
        for _ in range(15):
            make_log(self.cred, result='FAILED', face_match=False)
        log = make_log(self.cred, result='NOT_FOUND', face_match=False)
        score = rule_based_fraud_check(log)
        self.assertLessEqual(score, 1.0)

    def test_score_is_float(self):
        log = make_log(self.cred)
        score = rule_based_fraud_check(log)
        self.assertIsInstance(score, float)

    def test_many_recent_attempts_raises_score(self):
        # Create more than MAX_ATTEMPTS_PER_HOUR (10) logs
        for _ in range(12):
            make_log(self.cred, result='FAILED')
        log = make_log(self.cred)
        score = rule_based_fraud_check(log)
        self.assertGreater(score, 0.0)


# ── predict_fraud ─────────────────────────────────────────────────────────────

class PredictFraudTest(TestCase):

    def setUp(self):
        self.issuer = make_user('fd_issuer2', Role.ISSUER)
        self.cred = make_credential(self.issuer, 'UG-FD-002')

    def test_returns_expected_keys(self):
        log = make_log(self.cred)
        result = predict_fraud(log)
        self.assertIn('is_suspicious', result)
        self.assertIn('fraud_score', result)

    def test_is_suspicious_is_bool(self):
        log = make_log(self.cred)
        result = predict_fraud(log)
        self.assertIsInstance(result['is_suspicious'], bool)

    def test_fraud_score_between_zero_and_one(self):
        log = make_log(self.cred)
        result = predict_fraud(log)
        self.assertGreaterEqual(result['fraud_score'], 0.0)
        self.assertLessEqual(result['fraud_score'], 1.0)

    def test_exception_returns_safe_defaults(self):
        log = make_log(self.cred)
        with patch('fraud_detection.model.load_model',
                   side_effect=Exception('model exploded')):
            result = predict_fraud(log)
        self.assertFalse(result['is_suspicious'])
        self.assertEqual(result['fraud_score'], 0.0)

    def test_normal_log_uses_rule_based_when_no_model(self):
        log = make_log(self.cred, result='SUCCESS', face_match=True,
                       face_score=0.95)
        with patch('fraud_detection.model.load_model', return_value=None):
            result = predict_fraud(log)
        self.assertFalse(result['is_suspicious'])
