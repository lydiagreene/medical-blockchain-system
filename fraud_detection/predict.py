"""
fraud_detection/predict.py
Runs fraud prediction on a new verification attempt.
"""

import logging

logger = logging.getLogger(__name__)


def predict_fraud(verification_log):
    """
    Predicts whether a verification attempt is suspicious.
    Uses AI model if available, falls back to rule-based detection.

    Returns:
        is_suspicious: True if flagged as suspicious
        fraud_score: float between 0 and 1
    """
    from fraud_detection.model import (
        load_model,
        extract_features,
        rule_based_fraud_check
    )

    try:
        model = load_model()

        if model is not None:
            # Use AI model
            features = extract_features(verification_log)
            prediction = model.predict(features)

            # Isolation Forest returns -1 for anomalies, 1 for normal
            is_suspicious = bool(prediction[0] == -1)

            # Get anomaly score
            score = model.decision_function(features)[0]

            # Convert to 0-1 range (higher = more suspicious)
            fraud_score = max(0, min(1, (0.5 - score)))

            logger.info(
                f"AI fraud check: suspicious={is_suspicious}, "
                f"score={fraud_score:.3f}"
            )

        else:
            # Fall back to rule-based detection
            fraud_score = rule_based_fraud_check(verification_log)
            is_suspicious = fraud_score >= 0.3

            logger.info(
                f"Rule-based fraud check: suspicious={is_suspicious}, "
                f"score={fraud_score:.3f}"
            )

        return {
            'is_suspicious': is_suspicious,
            'fraud_score': round(fraud_score, 3),
        }

    except Exception as e:
        logger.error(f"Fraud prediction error: {str(e)}")
        return {
            'is_suspicious': False,
            'fraud_score': 0.0,
        }