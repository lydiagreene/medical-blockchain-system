"""
fraud_detection/train.py
Trains the Isolation Forest model on verification logs.
Run this script periodically to retrain the model
as more data accumulates.
"""

import os
import sys
import django
import numpy as np
import logging

logger = logging.getLogger(__name__)


def train_model():
    """
    Trains the fraud detection model using existing verification logs.
    Requires at least 10 verification logs to train.
    """
    from credentials.models import VerificationLog
    from fraud_detection.model import extract_features, save_model
    from sklearn.ensemble import IsolationForest

    logs = VerificationLog.objects.all().order_by('-timestamp')

    if logs.count() < 10:
        logger.warning(
            f"Not enough data to train model. "
            f"Need at least 10 logs, have {logs.count()}"
        )
        return False

    # Extract features from all logs
    features_list = []
    for log in logs:
        try:
            features = extract_features(log)
            features_list.append(features[0])
        except Exception as e:
            logger.error(f"Feature extraction error for log {log.id}: {e}")
            continue

    if len(features_list) < 10:
        logger.warning("Not enough valid features extracted")
        return False

    X = np.array(features_list)

    # Train Isolation Forest
    # contamination = expected proportion of fraudulent transactions
    model = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42,
    )
    model.fit(X)

    # Save the trained model
    save_model(model)

    logger.info(f"Model trained successfully on {len(features_list)} samples")
    return True


if __name__ == '__main__':
    # Allow running directly: python fraud_detection/train.py
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifydoc.settings')
    django.setup()
    success = train_model()
    print("Training successful!" if success else "Training failed — check logs")