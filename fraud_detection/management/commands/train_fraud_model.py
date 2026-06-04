"""
fraud_detection/management/commands/train_fraud_model.py

Django management command to train (or retrain) the fraud detection model.

Usage:
    python manage.py train_fraud_model
    python manage.py train_fraud_model --synthetic-only
    python manage.py train_fraud_model --min-samples 5
"""

import numpy as np
from django.core.management.base import BaseCommand
from sklearn.ensemble import IsolationForest


class Command(BaseCommand):
    help = 'Train the fraud detection Isolation Forest model.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--synthetic-only',
            action='store_true',
            help='Train on synthetic data only, ignoring real logs.',
        )
        parser.add_argument(
            '--min-samples',
            type=int,
            default=10,
            help='Minimum real logs required before real data is included (default: 10).',
        )

    def handle(self, *args, **options):
        from fraud_detection.model import save_model

        self.stdout.write('\n=== VerifyDoc Fraud Detection — Model Training ===\n')

        # ── Step 1: Generate synthetic training data ──────────────────────────
        #
        # Features (must match fraud_detection/model.py extract_features):
        #   [0] hour_of_day    (0–23)
        #   [1] face_score     (0.0–1.0)
        #   [2] is_face_match  (0 or 1)
        #   [3] recent_attempts (count in last hour)
        #   [4] failed_ratio   (0.0–1.0 over last 24h)

        rng = np.random.default_rng(seed=42)

        # Normal behaviour — 200 samples
        n_normal = 200
        normal = np.column_stack([
            rng.integers(7, 20, n_normal),           # business hours
            rng.uniform(0.6, 1.0, n_normal),          # high face score
            np.ones(n_normal),                         # face matched
            rng.integers(1, 4, n_normal),              # low attempt count
            rng.uniform(0.0, 0.15, n_normal),          # low failure rate
        ])

        # Suspicious behaviour — 20 samples (~10% contamination)
        n_suspicious = 20
        suspicious = np.column_stack([
            rng.integers(0, 6, n_suspicious),          # late-night / early-morning
            rng.uniform(0.0, 0.25, n_suspicious),      # low face score
            np.zeros(n_suspicious),                    # face did not match
            rng.integers(8, 16, n_suspicious),         # many attempts in short window
            rng.uniform(0.7, 1.0, n_suspicious),       # high failure rate
        ])

        X_synthetic = np.vstack([normal, suspicious])
        self.stdout.write(
            f'  Synthetic samples : {n_normal} normal + {n_suspicious} suspicious'
            f' = {len(X_synthetic)} total'
        )

        # ── Step 2: Extract features from real verification logs ──────────────
        X_real = np.empty((0, 5))

        if not options['synthetic_only']:
            from credentials.models import VerificationLog
            from fraud_detection.model import extract_features

            logs = VerificationLog.objects.all().order_by('-timestamp')
            real_count = logs.count()
            self.stdout.write(f'  Real logs in DB   : {real_count}')

            if real_count >= options['min_samples']:
                features_list = []
                errors = 0
                for log in logs:
                    try:
                        features_list.append(extract_features(log)[0])
                    except Exception:
                        errors += 1

                if features_list:
                    X_real = np.array(features_list)
                    self.stdout.write(
                        f'  Real features used: {len(features_list)}'
                        + (f' ({errors} skipped)' if errors else '')
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'  Only {real_count} real logs found '
                        f'(min={options["min_samples"]}) — training on synthetic data only.'
                    )
                )

        # ── Step 3: Combine and train ─────────────────────────────────────────
        X = np.vstack([X_synthetic, X_real]) if len(X_real) else X_synthetic
        self.stdout.write(f'  Total training samples: {len(X)}\n')

        self.stdout.write('  Training Isolation Forest...')
        model = IsolationForest(
            n_estimators=200,
            contamination=0.1,    # expect ~10% suspicious attempts
            max_samples='auto',
            random_state=42,
        )
        model.fit(X)

        # ── Step 4: Quick sanity check on synthetic data ──────────────────────
        normal_preds = model.predict(normal)
        suspicious_preds = model.predict(suspicious)
        normal_correct = np.sum(normal_preds == 1)
        suspicious_correct = np.sum(suspicious_preds == -1)

        self.stdout.write(
            f'  Sanity check — normal correctly classified    : '
            f'{normal_correct}/{n_normal} '
            f'({100*normal_correct/n_normal:.0f}%)'
        )
        self.stdout.write(
            f'  Sanity check — suspicious correctly flagged   : '
            f'{suspicious_correct}/{n_suspicious} '
            f'({100*suspicious_correct/n_suspicious:.0f}%)'
        )

        # ── Step 5: Save model ────────────────────────────────────────────────
        save_model(model)
        self.stdout.write(
            '\n' + self.style.SUCCESS(
                '  Model trained and saved successfully.'
            )
        )
        self.stdout.write(
            '  Re-run this command periodically as more real verification '
            'data accumulates.\n'
        )
