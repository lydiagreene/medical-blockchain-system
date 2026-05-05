"""
fraud_detection/model.py
AI fraud detection using scikit-learn Isolation Forest
Detects suspicious verification patterns
"""

import os
import pickle
import logging
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)


def extract_features(verification_log):
    """
    Extracts numerical features from a verification log entry.
    These features are fed into the AI model.

    Features:
    1. Hour of day (0-23) — unusual hours are suspicious
    2. Face match score (0-1) — low scores are suspicious
    3. Is face match (0 or 1)
    4. Recent attempts count — too many attempts is suspicious
    5. Failed attempts ratio — high failure rate is suspicious
    """
    from credentials.models import VerificationLog
    from django.utils import timezone
    from datetime import timedelta

    # Feature 1 — Hour of day
    hour_of_day = verification_log.timestamp.hour

    # Feature 2 — Face match score
    face_score = verification_log.face_match_score or 0.0

    # Feature 3 — Is face match
    is_face_match = 1 if verification_log.face_match else 0

    # Feature 4 — How many times this credential
    # was verified in the last hour
    one_hour_ago = timezone.now() - timedelta(hours=1)

    if verification_log.credential:
        recent_attempts = VerificationLog.objects.filter(
            credential=verification_log.credential,
            timestamp__gte=one_hour_ago
        ).count()
    else:
        recent_attempts = 0

    # Feature 5 — Ratio of failed attempts in last 24 hours
    one_day_ago = timezone.now() - timedelta(hours=24)

    if verification_log.credential:
        total_recent = VerificationLog.objects.filter(
            credential=verification_log.credential,
            timestamp__gte=one_day_ago
        ).count()

        failed_recent = VerificationLog.objects.filter(
            credential=verification_log.credential,
            timestamp__gte=one_day_ago,
            result__in=['FAILED', 'NOT_FOUND', 'FACE_MISMATCH']
        ).count()

        failed_ratio = failed_recent / total_recent if total_recent > 0 else 0
    else:
        failed_ratio = 0

    return np.array([
        hour_of_day,
        face_score,
        is_face_match,
        recent_attempts,
        failed_ratio,
    ]).reshape(1, -1)


def load_model():
    """
    Loads the trained fraud detection model from disk.
    Returns None if model does not exist yet.
    """
    model_path = settings.FRAUD_DETECTION['MODEL_PATH']

    if os.path.exists(model_path):
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        logger.info("Fraud detection model loaded successfully")
        return model
    else:
        logger.warning("Fraud detection model not found — using rule-based detection")
        return None


def save_model(model):
    """
    Saves the trained model to disk
    """
    model_path = settings.FRAUD_DETECTION['MODEL_PATH']
    os.makedirs(os.path.dirname(model_path), exist_ok=True)

    with open(model_path, 'wb') as f:
        pickle.dump(model, f)

    logger.info(f"Fraud detection model saved to {model_path}")


def rule_based_fraud_check(verification_log):
    """
    Simple rule-based fraud detection used when
    the AI model has not been trained yet.
    Returns a fraud score between 0 and 1.
    """
    fraud_score = 0.0
    max_attempts = settings.FRAUD_DETECTION['MAX_ATTEMPTS_PER_HOUR']

    from credentials.models import VerificationLog
    from django.utils import timezone
    from datetime import timedelta

    # Rule 1 — Too many attempts in one hour
    one_hour_ago = timezone.now() - timedelta(hours=1)

    if verification_log.credential:
        recent_count = VerificationLog.objects.filter(
            credential=verification_log.credential,
            timestamp__gte=one_hour_ago
        ).count()

        if recent_count > max_attempts:
            fraud_score += 0.5
        elif recent_count > max_attempts // 2:
            fraud_score += 0.2

    # Rule 2 — Face mismatch
    if not verification_log.face_match:
        fraud_score += 0.2

    # Rule 3 — Unusual hour (midnight to 5am)
    hour = verification_log.timestamp.hour
    if 0 <= hour <= 5:
        fraud_score += 0.1

    # Rule 4 — Credential not found
    if verification_log.result == 'NOT_FOUND':
        fraud_score += 0.2

    # Cap at 1.0
    return min(fraud_score, 1.0)